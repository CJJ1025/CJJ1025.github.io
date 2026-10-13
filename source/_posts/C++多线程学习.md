---
title: C++ 多线程：从「一前一后」到「一起跑」
date: 2026-10-12 22:30:00
tags:
  - C++
  - 多线程
  - C++11
  - 锁
categories:
  - C++学习
---

头文件：`<thread>`

线程（thread）是**操作系统调度的最小单位**——一个进程里的多个线程共享同一块内存，轮流被 CPU 执行。多线程适合"互不相关的任务一起跑"（如一边下载一边显示进度），但**共享数据需要保护**。

## 一、第一个线程程序

```cpp
#include <iostream>
#include <thread>
#include <string>
using namespace std;

void print(string msg) {
    cout << msg << endl;
}

int main() {
    // 创建线程，把参数传给线程入口函数
    thread t(print, "Hello, thread!");
    t.join();      // 主线程等待 t 线程结束
    return 0;
}
```

> **`join()` 之后 `t` 就不能再次 `join`/`detach` 了。**

## 二、线程的生命周期

### `join()`：汇合

主线程**阻塞等待**子线程结束，再继续往下走。

```cpp
thread t(print, "Hello, thread!");
t.join();        // 主线程在这里等 t 跑完
```

### `detach()`：分离

主线程和子线程**各跑各的**，子线程变成后台线程。`detach` 之后 `t` 就跟原线程对象脱钩，再不能 `join` 它。

```cpp
thread t(print, "Hello, thread!");
t.detach();      // 子线程后台跑，主线程不等待
```

> ⚠️ **坑**：`detach` 之后**不要让主线程提前退出**，否则子线程访问的全局变量可能消失 → 程序崩溃。

### `joinable()`：判断能否 join/detach

```cpp
thread t(print, "Hello, thread!");
if (t.joinable()) {
    t.join();
}
```

## 三、向线程函数传参数

默认情况下，`std::thread` **把参数拷贝一份**传给线程函数。

```cpp
void foo(int x) {
    cout << x << endl;
}

int main() {
    int a = 1;
    // thread t(foo, a);    // 拷贝传参，a 在子线程里改了不影响外面
    // 想传引用？
    thread t(foo, std::ref(a));   // 显式引用包装，按引用传
    t.join();
    return 0;
}
```

> **默认拷贝**传参；如果线程函数形参是**引用**类型，必须用 `std::ref(...)` 显式告诉 thread："我要传引用"。

```cpp
void foo(int& x) {
    x += 1;
}
int main() {
    int a = 1;
    thread t(foo, std::ref(a));   // 没有 ref 编译报错
    t.join();
    // a 现在是 2
    return 0;
}
```

## 四、数据共享：用互斥锁保护

**多个线程改同一个变量**会发生数据竞争，结果不确定。解决办法：**加锁**——同一时刻只允许一个线程进入临界区。

### `std::mutex`：基础互斥量

```cpp
#include <iostream>
#include <thread>
#include <mutex>
using namespace std;

int a = 0;
mutex mtx;              // 互斥锁

void func() {
    for (int i = 0; i < 10000; i++) {
        mtx.lock();     // 加锁
        a++;
        mtx.unlock();   // 解锁
    }
}

int main() {
    thread t1(func);
    thread t2(func);
    t1.join();
    t2.join();
    cout << a;          // 保证输出 20000
    return 0;
}
```

> ⚠️ **手动 `lock/unlock` 的隐患**：中间抛异常 → 永远不解锁 → 死锁。所以实际工程都用 RAII 包装：`lock_guard` / `unique_lock`。

### `lock_guard`：最简 RAII 锁

**构造时加锁，析构时自动解锁**——哪怕函数中途抛异常，析构也会跑，永远不会忘解锁。

```cpp
void func() {
    for (int i = 0; i < 10000; i++) {
        lock_guard<mutex> lg(mtx);     // 加锁
        a++;                            // 出作用域自动解锁
    }
}
```

### `unique_lock`：更灵活的 RAII 锁

功能比 `lock_guard` 多：可延迟加锁、可手动加解锁、可配条件变量。**代价是比 `lock_guard` 略慢一点**。

```cpp
void func() {
    for (int i = 0; i < 10000; i++) {
        unique_lock<mutex> lg(mtx);    // 加锁，析构自动解锁
        a++;
    }
}
```

#### 延迟加锁 `defer_lock`

构造时**不加锁**，自己手动决定什么时候加：

```cpp
unique_lock<mutex> lg(mtx, defer_lock);
lg.lock();           // 现在才加锁
```

#### 限时尝试加锁 `try_lock_for`

```cpp
unique_lock<mutex> lg(mtx, defer_lock);
if (lg.try_lock_for(chrono::milliseconds(1000))) {
    // 1 秒内抢到锁
} else {
    // 超时放弃
}
```

## 五、互斥量死锁

......

> 死锁的 4 个必要条件（互斥、占有并等待、不可剥夺、循环等待），打破任意一个都能避免死锁。常见做法：**按固定顺序加锁**、**用 `std::lock` 一次性锁多个互斥量**（内部用死锁避免算法）。

## 六、其他常用工具

### `std::call_once`：多线程只跑一次

```cpp
#include <iostream>
#include <thread>
#include <mutex>
using namespace std;

once_flag flag;

void do_once() {
    call_once(flag, []() {
        cout << "this function only does once" << endl;
    });
}

int main() {
    thread t1(do_once);
    thread t2(do_once);
    thread t3(do_once);
    t1.join();
    t2.join();
    t3.join();
    return 0;
}
```

### `std::this_thread::sleep_for`：让当前线程睡一会儿

```cpp
this_thread::sleep_for(chrono::milliseconds(2000));     // 睡 2 秒
```

## 七、线程安全

> **线程安全**：多线程程序每次运行的结果都和单线程运行结果一致。
>
> 简单判据：有没有「多个线程同时读写同一块共享数据」。有 → 加锁保护或换线程局部数据。

## 八、易错点清单

1. **忘 `join` 或 `detach`**：`std::thread` 析构时如果还是 `joinable`，程序会直接 `std::terminate` 崩溃。
2. **没加锁改共享变量**：结果随机、调试玄学。
3. **手动 `lock/unlock` 中间忘 `unlock` 或抛异常** → 永远死锁。用 `lock_guard` / `unique_lock` 自动管理。
4. **锁的粒度太粗**：把不该一起锁的代码一起锁，性能掉到不如单线程。
5. **多个锁顺序不一致**：A 线程先锁 m1 再锁 m2，B 线程先锁 m2 再锁 m1 → 经典死锁。统一加锁顺序或用 `std::lock`。
6. **把局部变量的引用传给线程**：线程跑起来时变量已经销毁 → 悬垂引用。

## 九、极简速记

| 需求 | 写法 |
| --- | --- |
| 等子线程结束 | `t.join();` |
| 后台跑不管它 | `t.detach();` |
| 简单加锁 | `lock_guard<mutex> lg(mtx);` |
| 灵活加锁（延迟 / 条件变量） | `unique_lock<mutex> lg(mtx);` |
| 多线程只跑一次 | `call_once(flag, func);` |
| 让线程睡一会 | `this_thread::sleep_for(ms);` |

## 十、小结

- 线程 = 操作系统调度的最小单位，同一进程内共享内存；
- **共享数据必须加锁**：`lock_guard` / `unique_lock` 是 RAII 自动解锁；
- **`join` 不能忘**：`thread` 析构前必须是 `join` 或 `detach` 过的；
- 多线程不是越快越好，加锁和同步本身有开销，先把算法和数据结构优化好。
