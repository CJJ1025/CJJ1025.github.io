---
title: 'C++ type_traits：编译期类型查询与类型变换'
date: 2026-10-15 00:00:00
tags:
  - C++
  - 模板
  - type_traits
  - 编译期
categories:
  - C++学习
---

`type_traits` 是**编译期类型反射工具库**，头文件 `<type_traits>`。

作用：**编译期查询、修改类型属性**，所有逻辑在编译阶段完成，运行时不产生任何指令。大量配合模板、SFINAE、concept、万能转发使用。

> 分成两大类：**类型查询（traits 萃取）** 和 **类型变换（修改类型）**

---

## 一、类型查询：is_xxx 系列

C++17 之后推荐用 `_v` 变量模板，直接得到 bool 编译期常量，写法 `std::is_xxx_v<T>`。

### 1.1 基础类别判断

```cpp
std::is_void_v<T>                  // 是否 void
std::is_integral_v<T>              // 是否整型 int/long/char 等
std::is_floating_point_v<T>        // 是否浮点 float/double
std::is_arithmetic_v<T>            // 算术类型 = 整型 + 浮点
std::is_pointer_v<T>               // 是否裸指针
std::is_lvalue_reference_v<T>      // 是否左值引用 &
std::is_rvalue_reference_v<T>      // 是否右值引用 &&
std::is_array_v<T>                 // 是否数组类型
std::is_class_v<T>                 // 是否 class/struct
std::is_union_v<T>                 // 是否联合体
std::is_enum_v<T>                  // 是否枚举
```

### 1.2 对象生命周期与平凡性

```cpp
std::is_trivial_v<T>                          // 是否平凡类
std::is_trivially_copyable_v<T>               // 平凡可复制，memcpy 安全
std::is_standard_layout_v<T>                  // 标准布局，兼容 C struct
std::is_pod_v<T>                              // C++17 已弃用！POD = trivial + standard-layout
std::is_trivially_constructible_v<T, Args...> // 是否可以平凡构造
std::is_trivially_destructible_v<T>           // 是否平凡析构
```

### 1.3 cv 限定符

```cpp
std::is_const_v<T>        // 是否带 const
std::is_volatile_v<T>     // 是否带 volatile
std::is_cv_qualified_v<T> // 是否带 const 或 volatile
```

### 1.4 关系判断

```cpp
std::is_same_v<T, U>              // T、U 是不是完全同一个类型
std::is_base_of_v<Base, Derived>  // Base 是不是 Derived 的基类
std::is_convertible_v<T, U>       // T 能不能隐式转换到 U
```

示例：

```cpp
#include <type_traits>

static_assert(std::is_integral_v<int>);
static_assert(!std::is_integral_v<double>);
static_assert(std::is_same_v<int, int>);
```

`static_assert` 是编译期断言，条件不满足直接编译报错，非常适合模板调试。

---

## 二、类型变换 traits（修改类型，返回新类型）

这类是**类型元函数**，C++11 用 `::type`；C++14 提供了 `_t` 别名模板简化写法。

| 旧写法 | C++14 简写 | 作用 |
| --- | --- | --- |
| `std::remove_const<T>::type` | `std::remove_const_t<T>` | 去掉顶层 const |
| `std::remove_volatile<T>::type` | `std::remove_volatile_t<T>` | 去掉 volatile |
| `std::remove_cv<T>::type` | `std::remove_cv_t<T>` | 同时去掉 const + volatile |
| `std::remove_reference<T>::type` | `std::remove_reference_t<T>` | 剥离引用（`&` / `&&` 都删掉） |
| `std::add_lvalue_reference<T>::type` | `std::add_lvalue_reference_t<T>` | 添加左值引用 `T&` |
| `std::add_rvalue_reference<T>::type` | `std::add_rvalue_reference_t<T>` | 添加右值引用 `T&&` |
| `std::remove_pointer<T>::type` | `std::remove_pointer_t<T>` | 剥掉一层指针 |

例子：

```cpp
using T = int const&;
using U = std::remove_cvref_t<T>;  // C++20：同时剥掉 cv 和引用 → int
```

> `remove_cvref_t` 非常常用，万能转发里经常用它拿到原始类型。

---

## 三、核心原理：为什么 type_traits 能工作

本质是**模板特化**。标准库预先对每一类类型做了偏特化。手写一个 `is_pointer` 的原理示意：

```cpp
template <typename T>
struct is_pointer : std::false_type {};

template <typename T>
struct is_pointer<T*> : std::true_type {};  // 指针的特化版本
```

`true_type` / `false_type` 内部自带静态常量 `value`。所谓 `_v`，就是 `is_pointer<T>::value` 的别名模板。

> 全部在**编译期计算**，运行时没有任何指令，零开销。

---

## 四、经典使用场景

### 4.1 SFINAE 筛选函数重载（C++11/14）

只允许整型调用这个函数：

```cpp
template <typename T>
std::enable_if_t<std::is_integral_v<T>> foo(T x) {
    // enable_if_t：条件成立才有这个函数，否则被 SFINAE 丢弃
}
```

`enable_if_t` 也属于 type_traits：条件成立时返回 `void`，不成立时模板直接被丢弃。

### 4.2 配合万能转发，萃取原始类型

```cpp
template <typename T>
void func(T&& t) {
    using RawT = std::remove_cvref_t<T>;  // 剥离引用、const、volatile
    // RawT 就是去掉所有修饰的底层类型
}
```

### 4.3 static_assert 保护模板

```cpp
template <typename T>
void safe_memcpy_copy(T& dst, const T& src) {
    static_assert(std::is_trivially_copyable_v<T>, "只允许平凡可复制类型 memcpy!");
    std::memcpy(&dst, &src, sizeof(T));
}
```

### 4.4 C++20 concept（底层大量依赖 type_traits）

```cpp
template <std::is_integral T>
void bar(T val) {}
```

---

## 五、重要坑点

1. **判断的是类型，不是变量。** `is_const_v` 看的是**类型本身**有没有 const，而不是"这个变量能不能被修改"。
2. `remove_reference_t` 只剥离**外层引用**，不会递归处理多层。
3. `is_lvalue_reference_v` 看的是**类型**，不是表达式的值类别。
   > 想拿表达式的值类别要用 `decltype(表达式)`，type_traits 是对**类型**做判断。
4. `is_same` 严格匹配，带不带引用、const 都会影响结果：

   ```cpp
   std::is_same_v<int, int&>;  // false！
   ```

5. 很多 traits 有**隐式实例化要求**，不能对不完整类型使用（部分版本属于未定义行为）。
