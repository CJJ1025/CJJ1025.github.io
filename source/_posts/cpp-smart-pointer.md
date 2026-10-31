---
title: C++ 智能指针：用 RAII 让堆内存"自动归还"
date: 2026-10-12 22:10:00
tags:
  - C++
  - 智能指针
  - 内存管理
  - RAII
categories:
  - C++学习
---

头文件：`#include <memory>`

智能指针的核心目的：**自动管理堆内存，离开作用域自动释放，杜绝内存泄漏**。底层原理：**RAII（Resource Acquisition Is Initialization，资源获取即初始化）**——构造时拿到资源，析构时释放资源。

> 裸指针的痛点：`new` 出来的内存忘 `delete` → 内存泄漏；重复 `delete`；野指针。智能指针把 `delete` 写进了析构函数。

## 一、三大智能指针总览

| 类型 | 所有权模型 | 拷贝 | 底层开销 | 用途 |
| --- | --- | --- | --- | --- |
| `unique_ptr` | 独占 | ❌ 不可拷贝，只能 `move` | 极小（≈裸指针） | **绝大多数场景首选** |
| `shared_ptr` | 共享（引用计数） | ✅ | 原子计数，开销大 | 需要多个指针共用一块内存 |
| `weak_ptr` | 弱引用，不拥有 | ✅ | 很小 | 配合 `shared_ptr` 解决循环引用 |

## 二、`unique_ptr`：独占智能指针

**一块堆内存，只能有一个 `unique_ptr` 指向它**：不能拷贝，只能移动。

```cpp
#include <iostream>
#include <memory>
using namespace std;

struct Node {
    int val;
    Node(int v) : val(v) { cout << "构造\n"; }
    ~Node() { cout << "析构\n"; }
};

int main() {
    // C++14 推荐 make_unique
    unique_ptr<Node> p = make_unique<Node>(10);
    cout << p->val << endl;     // 10
    (*p).val = 20;

    // unique_ptr 不能拷贝！下面这行编译报错
    // unique_ptr<Node> p2 = p;

    // ✅ 只能移动所有权，move 之后 p 变成空
    unique_ptr<Node> p2 = move(p);
    if (!p) cout << "p 现在是空\n";

    // 手动释放
    p2.reset();
    return 0;
}
```

### 特点

- **独占**，开销极小，几乎等于裸指针；
- 不能拷贝，`std::move` 转移所有权；
- 离开作用域自动 `delete`；
- `reset()`：释放资源；`get()`：拿到底层裸指针（不释放所有权）。

> **优先选 `unique_ptr`**——不需要共享就别用 `shared_ptr`。

## 三、`shared_ptr`：共享智能指针

**多个 `shared_ptr` 可指向同一块内存，内部维护引用计数**。每多一个指向这块内存的 `shared_ptr`，计数 +1；指针销毁，计数 −1；**计数降到 0 才真正释放堆内存**。

```cpp
#include <iostream>
#include <memory>
using namespace std;

struct Node {
    Node() { cout << "构造\n"; }
    ~Node() { cout << "析构\n"; }
};

int main() {
    // make_shared 推荐：一次性分配对象 + 控制块，效率更高
    shared_ptr<Node> p1 = make_shared<Node>();
    cout << p1.use_count() << endl;     // 1

    shared_ptr<Node> p2 = p1;           // ✅ 允许拷贝，计数 +1
    cout << p1.use_count() << endl;     // 2

    p1.reset();                         // p1 放弃所有权，计数减为 1，内存不释放
    cout << p2.use_count() << endl;     // 1

    p2.reset();                         // 计数归 0，调用析构释放内存
    return 0;
}
```

### 常用接口

- `.use_count()`：获取当前引用计数
- `.reset()`：释放当前对象，引用计数 −1
- `.get()`：获取底层裸指针
- 支持 `->` 和 `*` 解引用

### 缺点

- 引用计数需要**原子操作**，有性能开销。
- **致命坑：循环引用，内存永远不会释放！**

### 循环引用示例（内存泄漏）

```cpp
struct A {
    shared_ptr<A> next;
    ~A() { cout << "A 析构\n"; }
};

int main() {
    auto p1 = make_shared<A>();
    auto p2 = make_shared<A>();
    p1->next = p2;
    p2->next = p1;
    // 两个对象互相引用，引用计数都变成 2；
    // 离开作用域各自减到 1，永远不会释放 → 内存泄漏
    return 0;
}
```

> 解决办法：用 `weak_ptr` 替换其中一个 `shared_ptr`。

## 四、`weak_ptr`：弱智能指针

`weak_ptr` **不增加引用计数**，不拥有资源，只是「观察者」。专门配合 `shared_ptr` 解决循环引用。**不能直接 `->` 解引用**，需要用 `.lock()` 尝试提升为 `shared_ptr`。

```cpp
struct A {
    weak_ptr<A> next;          // 改成 weak_ptr，不增加计数
    ~A() { cout << "A 析构\n"; }
};

int main() {
    auto p1 = make_shared<A>();
    auto p2 = make_shared<A>();
    p1->next = p2;
    p2->next = p1;
    // 退出作用域，计数归零，正常析构！
    return 0;
}
```

### 常用接口

- `.lock()`：返回 `shared_ptr`，如果对象已销毁，返回空 `shared_ptr`
- `.expired()`：判断资源是否已经释放（过期）

## 五、`enable_shared_from_this`（补充）

如果类里面想拿到指向自身的 `shared_ptr`，继承 `enable_shared_from_this<T>`，调用 `shared_from_this()`。

```cpp
struct Node : enable_shared_from_this<Node> {
    shared_ptr<Node> getSelf() {
        return shared_from_this();
    }
};

int main() {
    auto p = make_shared<Node>();
    auto p2 = p->getSelf();
    return 0;
}
```

## 六、高频坑点（竞赛 / 面试必考）

### 6.1 不要用裸指针直接初始化多个 `shared_ptr`

```cpp
int* raw = new int(10);
shared_ptr<int> a(raw);
shared_ptr<int> b(raw);      // ❌ 灾难！a、b 各自以为自己是所有者，会 delete 两次
```

✅ 正确：`auto a = make_shared<int>(10); auto b = a;`

### 6.2 优先 `make_shared` / `make_unique`，而不是 `new`

- `make_shared`：一次性分配「对象 + 控制块」，减少内存碎片；
- `make_unique`：C++14 起支持；相比 `unique_ptr<T>(new T)` 更安全（异常时不会泄漏）。

### 6.3 `unique_ptr` 管理数组

```cpp
unique_ptr<int[]> arr(new int[10]);     // 析构自动 delete[]
```

> `shared_ptr` 管理数组需要自定义删除器，比较麻烦。

### 6.4 不要把 `this` 直接存入 `shared_ptr`

要用 `enable_shared_from_this<T>`，否则两个 `shared_ptr` 各自持有一份「控制块 + 指针」，析构时同一块内存被 `delete` 两次。

## 七、极简速记

| 指针 | 选它的理由 |
| --- | --- |
| `unique_ptr` | 默认选它，独占、零开销；不确定选谁就选它 |
| `shared_ptr` | 真的需要多个所有者共享一块资源时 |
| `weak_ptr` | 用来打破 `shared_ptr` 循环引用 |
| `make_shared` / `make_unique` | 创建时永远首选，效率高、更安全 |

## 八、小结

- 智能指针把 `delete` 写进析构函数，**离开作用域自动释放**，从根源上解决内存泄漏；
- **优先 `unique_ptr`**，不共享就不上 `shared_ptr`；
- 循环引用用 `weak_ptr` 打破；
- 创建永远用 `make_*`，别用裸 `new`。
