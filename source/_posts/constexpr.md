---
title: C++ constexpr：让计算发生在"编译期"
date: 2026-10-13 22:00:00
tags:
  - C++
  - constexpr
  - 编译期
  - C++11
categories:
  - C++学习
---

`constexpr` = **编译期可求值**。标记变量 / 函数 / 构造函数，告诉编译器：**这个东西能在编译阶段就算出结果**，而不是等到程序运行时才算。

> 区分：`const` 只是"只读"，不一定编译期求值；`constexpr` 强调"可以编译期计算"。

---

## 一、`const` vs `constexpr`：最容易混的一对

| 关键字 | 含义 | 求值时机 |
| --- | --- | --- |
| `const` | 只读，不能改 | 可以运行时求值 |
| `constexpr` | **编译期可计算** | 优先编译期求值，也支持运行调用 |

简单记忆：

- `const`：**不能写**（只读）；
- `constexpr`：**能在编译期算**。

```cpp
constexpr double pi  = 3.1415926;   // 编译期常量
const     double pi2 = 3.1415926;   // 只读常量，语义不同
```

---

## 二、`constexpr` 变量

```cpp
constexpr int val = 2 * 2 * 2 * 2;     // 编译期直接算出 16，运行时不算
int arr[val];                          // ✅ 数组长度要求编译期常量
```

初始化表达式**必须编译期可算**——传入运行期变量直接编译报错：

```cpp
int n = 10;
const     int c = n;                   // c 只读，但值是运行时才确定
// int arr[c];                        // ❌ 不能作为数组长度（标准 C++ 不允许）

constexpr int e = n;                   // ❌ 编译报错：n 是运行期变量
```

---

## 三、`constexpr` 函数

**两阶段行为**：

| 传入的实参 | 行为 |
| --- | --- |
| **编译期常量** | 编译期执行，结果是编译期常量 |
| **运行期变量** | 退化成普通函数，运行期执行 |

### 3.1 C++11 版本（最严格）

C++11 限制极强：函数体**只能有一条 `return`**。

```cpp
constexpr int pow4(int x) {
    return x * x * x * x;
}

int main() {
    constexpr int res = pow4(2);    // ✅ 编译期算出 16
    int a = 3;
    int b = pow4(a);                // a 是运行期变量 → 运行期计算
    return 0;
}
```

### 3.2 C++14 版本（放开限制）

C++14 允许 **`if` / `for` 循环 / 局部变量**，写法灵活很多：

```cpp
constexpr int sum(int n) {
    int s = 0;
    for (int i = 1; i <= n; i++) {
        s += i;
    }
    return s;
}

constexpr int total = sum(100);    // 编译期算出 5050
```

> C++20 进一步允许在 `constexpr` 函数里用 STL（`vector` / `string` 等）。

---

## 四、`constexpr` 构造函数

让对象的构造发生在编译期：

```cpp
struct Point {
    int x, y;
    constexpr Point(int xx, int yy) : x(xx), y(yy) {}
};

constexpr Point p(1, 2);   // 编译期构造对象
```

---

## 五、C++20 新增：`consteval` / `constinit`

| 关键字 | 含义 |
| --- | --- |
| `consteval` | **强制编译期函数**，传运行期实参直接编译报错 |
| `constinit` | 保证静态 / 线程局部变量在编译期初始化，规避"静态初始化顺序灾难" |

```cpp
consteval int square(int x) { return x * x; }

int main() {
    constexpr int a = square(5);   // ✅ OK
    int n = 5;
    // int b = square(n);          // ❌ n 是运行期变量，consteval 不允许
    return 0;
}
```

---

## 六、易错点清单

1. **`constexpr` 不是强制编译期执行，是"允许"**。实参是运行期变量时，**自动降级**为普通运行期函数。
2. **复杂超大循环的 `constexpr` 函数会拖慢编译**——甚至编译超时。**别在 constexpr 里写几万次循环**。
3. **`constexpr` 函数不能调用非 `constexpr` 函数**（C++11/14，C++20 放宽）。
4. **数组大小、模板参数必须编译期常量**——必须用 `constexpr`。
5. **构造函数想加 `constexpr` 必须满足所有成员都能在编译期构造**——比如不能有 `std::string`（C++20 之前）。

---

## 七、典型用途

| 用途 | 例子 |
| --- | --- |
| 编译期常量（数组长度、模板参数） | `constexpr int N = 10; int a[N];` |
| 编译期求值数学函数 | 阶乘、幂、CRC、查表 |
| 编译期校验 | `static_assert(cond);` |
| 编译期构造对象 | 几何点、复数、小结构体 |
| 竞赛加速 | 预生成查找表 / 编译期计算三角函数表 |

---

## 八、`constexpr` 决策流程图

{% mermaid %}
flowchart LR
    A[调用 constexpr 函数] --> B{实参是否编译期常量}
    B -->|是| C[编译期执行<br/>结果是编译期常量]
    B -->|否| D[退化成普通函数<br/>运行期执行]
{% endmermaid %}

---

## 九、极简速记

| 写法 | 含义 |
| --- | --- |
| `constexpr int x = 10;` | 编译期常量 |
| `constexpr int f(int x) { return x * x; }` | 既可编译期调用，也可运行期调用 |
| `constexpr Point p(1, 2);` | 编译期构造对象 |
| `consteval int f(int x);` | C++20，**强制**编译期 |
| `constinit int x = foo();` | C++20，保证静态变量编译期初始化 |

---

## 十、小结

- `constexpr` = "**能在编译期算**"，比 `const` 强；
- **既可编译期调用，也可运行期调用**——传入的实参决定走哪条路；
- C++11 限制严格（单 return），C++14 放开（支持循环 / 局部变量），C++20 进一步支持 STL；
- 常见用途：**数组长度、模板参数、查表、几何对象**；
- 写法口诀：**"const 只读，constexpr 能算；运行传参自动降级"**。
