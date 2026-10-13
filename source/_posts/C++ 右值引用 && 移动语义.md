---
title: C++ 右值引用与移动语义：把"昂贵的拷贝"换成"廉价的搬运"
date: 2026-10-12 22:20:00
tags:
  - C++
  - 右值引用
  - 移动语义
  - C++11
categories:
  - C++学习
---

> 核心解决的痛点：**大对象拷贝时产生昂贵的深拷贝开销，浪费内存、时间**。例如 `vector<string>`、自定义的大数组对象，拷贝会复制全部数据；移动语义可以直接"偷走"资源，不复制数据。

## 一、左值、右值

### 左值（lvalue）

**能取地址、可以修改的持久对象**，有名字。

```cpp
int a = 10;        // a 是左值
int b = a;         // a 作为表达式结果是右值，但 a 这个变量本身是左值
```

> 可以写 `&a` 取地址。

### 右值（rvalue）

**临时对象，没有名字，不能取地址，生命周期很短**。分两种：

| 类型 | 含义 | 举例 |
| --- | --- | --- |
| 纯右值（prvalue） | 字面量、表达式返回的临时值 | `1 + 2`、`42`、函数返回的临时对象 |
| 将亡值（xvalue） | 即将被移动的临时对象 | `std::move(a)` 的结果 |

```cpp
10;                 // 字面量，右值
a + 5;              // 表达式结果临时量，右值
func();             // 如果 func 返回对象，返回的临时对象是右值
```

> ❗ 不能 `&(a + 5)`，对右值取地址直接编译报错。

### 引用回顾

| 引用类型 | 能绑定什么 |
| --- | --- |
| 普通左值引用 `T&` | 只能绑定**左值** |
| `const` 左值引用 `const T&` | **万能**：既能绑左值，也能绑右值 |

```cpp
int a = 10;
int& r1 = a;            // OK，a 是左值
int& r2 = 10;           // ❌ 错误，10 是右值，普通引用绑不上

const int& r = 10;      // OK，把临时右值的生命周期延长到引用 r 的作用域
```

## 二、右值引用 `T&&`

**两个 `&&`，专门用来绑定右值（临时对象）**。

```cpp
int&& rr  = 10;         // OK，右值引用绑定右值 10
int&& rr2 = a;          // ❌ 错误，a 是左值，右值引用不能绑左值
```

> ⚠️ **大坑**：右值引用变量本身，是一个**左值**！

```cpp
int&& rr = 10;
// rr 这个变量有名字，可以取地址 → rr 本身是左值！
// rr 只是「绑定的对象是右值」而已。
```

这是最容易混淆的点。

### `std::move`

`std::move(左值)`：**不会移动、不会拷贝，只是强制把左值转换成右值类型**。

```cpp
string s = "hello";
string&& rs = std::move(s);
// s 还是原来的变量，只是被转成了右值类型，s 本身还存在
```

> `std::move` = **类型转换工具**，不是"搬运"动作；真正的搬运发生在**移动构造 / 移动赋值函数**里。

## 三、移动语义

### 拷贝构造（老方式）

```cpp
string a("aaaaa");
string b = a;
// 拷贝构造：分配新堆内存，把 a 的字符全部复制一份给 b → 深拷贝，开销大
```

### 移动构造函数 `ClassName(ClassName&& other)`

接收**同类的右值引用**。**不复制资源，直接把 other 内部的堆指针"偷"过来，再把 other 置为空**。

> 接管临时对象的资源，避免深拷贝。

```cpp
#include <iostream>
using namespace std;

class BigObj {
public:
    int* data;
    // 构造
    BigObj() {
        data = new int[1000];
    }
    // 拷贝构造：深拷贝
    BigObj(const BigObj& other) {
        cout << "拷贝构造" << endl;
        data = new int[1000];
        for (int i = 0; i < 1000; i++) data[i] = other.data[i];
    }
    // ✅ 移动构造：接收右值引用，移动语义
    BigObj(BigObj&& other) {
        cout << "移动构造" << endl;
        // 直接偷走对方的堆资源，不复制
        data = other.data;
        other.data = nullptr;       // 把源对象置空，防止析构重复释放
    }
    ~BigObj() {
        delete[] data;
    }
};

BigObj createObj() {
    BigObj tmp;
    return tmp;                      // 返回临时对象（右值）
}

int main() {
    BigObj o1 = createObj();
    // createObj 返回临时右值，调用移动构造，不用深拷贝！

    BigObj o2;
    BigObj o3 = std::move(o2);
    // std::move 把 o2 左值转为右值，触发移动构造，o2 资源被掏空
    return 0;
}
```

### 移动赋值运算符 `operator=(T&& other)`

```cpp
BigObj& operator=(BigObj&& other) {
    cout << "移动赋值" << endl;
    if (this == &other) return *this;     // 防止自赋值
    delete[] data;                       // 释放自己旧资源
    data = other.data;                   // 偷资源
    other.data = nullptr;
    return *this;
}
```

## 四、什么时候调用拷贝，什么时候调用移动？

| 源对象 | 优先调用 |
| --- | --- |
| 临时右值 | 移动构造 / 移动赋值；没有移动函数则 fallback 到拷贝 |
| 普通左值 | 拷贝构造 / 拷贝赋值；用 `std::move(obj)` 强制转右值才会调用移动 |

> ⚠️ 被 `move` 之后的源对象：处于**有效但未定义的状态**，可以赋值、可以析构，但**不要读取它原来的数据**！

```cpp
BigObj o2;
BigObj o3 = std::move(o2);
// o2.data 已经是 nullptr，不要再读 o2 的数据！
// 只能销毁或者重新赋值。
```

## 五、拷贝消除（RVO / NRVO）

返回局部对象时，编译器的**返回值优化**有时会直接在目标对象上构造，**拷贝、移动都不会发生**。

```cpp
BigObj createObj() {
    BigObj tmp;
    return tmp;          // 大多数编译器会做 RVO，根本不调用任何构造
}
BigObj o1 = createObj();
// 编译器 RVO 优化，直接在 o1 位置构造 tmp，不触发移动、不触发拷贝
```

## 六、转发引用（万能引用 `T&&`）

模板里的 `T&&` **不是单纯的右值引用**，而是**转发引用**：既能接收左值，也能接收右值。配合 `std::forward<T>` 实现**完美转发**，保留原来的值类别（左值还是右值）。

```cpp
template<typename T>
void func(T&& arg) {                          // 万能引用
    other(std::forward<T>(arg));              // 保持 arg 是左值就传左值，右值就传右值
}
```

> **区分**：不是模板参数的 `Type&&` 才是普通右值引用；模板里的 `T&&` 才是万能引用。

## 七、引用折叠（Reference Collapsing）

> 一句话核心：C++ 语法禁止直接写「引用的引用」（`int& &&x` 直接编译报错）；但**模板实例化 / `typedef` / `using` 类型别名** 产生引用的引用时，编译器自动合并，这个机制就是引用折叠（C++11 引入）。

### 4 条折叠规则

| 展开后的类型 | 折叠结果 |
| --- | --- |
| `T& &` | `T&` |
| `T& &&` | `T&` |
| `T&& &` | `T&` |
| `T&& &&` | `T&&` |

**极简口诀**：**只要出现左值引用 `&`，折叠结果一定是左值引用 `T&`；只有 `&& &&` 才折叠成右值引用 `T&&`**。

### `typedef` 演示

```cpp
#include <iostream>
using namespace std;

int main() {
    typedef int&  LRef;
    typedef int&& RRef;

    int a = 10;
    LRef&  r1 = a;       // LRef 是 int& → int& &   → 折叠 → int&
    LRef&& r2 = a;       // LRef 是 int& → int& &&  → 折叠 → int&
    RRef&  r3 = a;       // RRef 是 int&& → int&& & → 折叠 → int&
    RRef&& r4 = 20;      // RRef 是 int&& → int&& && → 折叠 → int&&
    return 0;
}
```

### 万能引用靠引用折叠实现

```cpp
template<typename T>
void func(T&& param) {
    // ...
}

int main() {
    int x = 10;
    func(x);             // x 是左值 → T 被推导成 int&
                        // T&& → int& && → 折叠 → int&（左值引用）

    func(20);            // 20 是右值 → T 推导成 int
                        // T&& → int&& && → 折叠 → int&&（右值引用）
    return 0;
}
```

- 传**左值**：T 推导为 `类型&`，折叠后形参变成左值引用；
- 传**右值**：T 推导为 `类型`，折叠后形参变成右值引用。

> ⚠️ **坑**：只有**模板参数 T** 的 `T&&` 才是万能引用。`const T&&`、类内的 `T&&` **都不是万能引用**！

### 引用折叠支撑完美转发 `std::forward`

`std::forward<T>(arg)` 的底层原理就是**保留值类别，靠引用折叠还原原本的左/右值属性**。

```cpp
template<typename T>
void wrapper(T&& arg) {
    target(std::forward<T>(arg));        // 是左值传左值，是右值传右值
}
```

> 没有引用折叠，完美转发就无法实现。

## 八、易错点清单

1. **直接手写双重引用是非法**：`int& &&p = a;` 直接写会编译报错；只有类型推导、`typedef`/`using` 产生的双重引用才触发折叠。
2. **引用折叠只处理类型层面**，不改变表达式的值类别。
3. **`auto&&` 也是万能引用**，同样触发引用折叠（C++14 起常用）：

   ```cpp
   auto&& v1 = x;      // x 左值 → auto 推导 int& → int& && → int&
   auto&& v2 = 5;      // 5 右值 → auto 推导 int → int&&
   ```

## 九、值类别关系图

{% mermaid %}
venn
    title C++11 值类别集合关系 (Value Categories)
    A["glvalue<br/>广义左值"]
    B["rvalue<br/>广义右值"]
    A and B["xvalue<br/>将亡值"]
    A not B["lvalue<br/>左值"]
    B not A["prvalue<br/>纯右值"]
{% endmermaid %}

## 十、小结

- 右值引用 `T&&` 是绑定右值的"特殊引用"；
- 移动语义 = **偷资源 + 置空源对象**，避免深拷贝；
- 触发移动：右值参数 / `std::move(左值)`；
- 万能引用 = 模板里的 `T&&`，靠引用折叠实现，配 `std::forward<T>` 做完美转发；
- 现代 C++：**写类时同时提供拷贝构造和移动构造**，让编译器自动挑最合适的。
