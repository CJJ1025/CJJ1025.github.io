---
title: C++ decltype
date: 2026-10-13 21:00:00
tags:
  - C++
  - decltype
  - 类型推导
  - C++11
categories:
  - C++学习
---

`decltype` 是 C++11 引入的关键字：**推导表达式的类型**，**编译期就确定，不执行表达式**。

```cpp
decltype(表达式)   // 拿到表达式对应的类型
```

> 一句话：`decltype` 问编译器"这个表达式是什么类型"，编译器如实回答。和 `auto` 看上去很像，但**保留引用 / 顶层 const**，比 `auto` 更精确。

---

## 一、四条基础规则

`decltype(expr)` 的推导结果取决于括号内表达式的**类型 + 值类别**：

| 表达式 `expr` 的形态 | `decltype(expr)` 推导结果 |
| --- | --- |
| **变量名**（裸的标识符） | 变量声明时的类型（含引用） |
| **左值表达式**（非变量名） | `T&`（左值引用） |
| **纯右值** | `T`（普通类型） |
| **将亡值**（`std::move(x)` 这类） | `T&&`（右值引用） |

> 简单记：**只有"裸的变量名"按字面理解，其他表达式都按值类别加引用。**

---

## 二、`decltype(x)` vs `decltype((x))`：最经典的坑

```cpp
int x = 10;

decltype(x)   a;          // int       — 裸名字 x，取变量声明类型
decltype((x)) b = x;      // int&      — (x) 是表达式，x 是左值 → 推导出引用
```

**原因**：

- `x` 是"标识符 / 变量名"→ 触发特殊规则，直接取变量声明类型；
- `(x)` 是"**表达式**"（不再是裸名字），所以按值类别规则 → `x` 是左值 → 推出 `int&`。

> ⚠️ 多一层括号，类型就差一截。**写代码时心里要想清楚：传进去的是"名字"还是"表达式"**。

---

## 三、基础示例

```cpp
int x = 10;
decltype(x)   a;          // int
decltype((x)) b = x;      // int&   —— (x) 是左值表达式

double y = 3.14;
decltype(x + y) c;        // double  —— x+y 是纯右值
```

---

## 四、和 `auto` 的对比

| 关键字 | 推导规则 | 顶层 `const` | 引用 |
| --- | --- | --- | --- |
| `auto` | 按初始化表达式推导 | **丢掉** | **去掉** |
| `decltype` | 按表达式类型 + 值类别 | **保留** | **保留**（按规则） |
| `decltype(auto)` | 走 `decltype` 规则 | 保留 | 保留 |

```cpp
const int m = 99;
auto         v1 = m;        // int        —— auto 丢掉 const
decltype(m)  v2;            // const int  —— 原样保留

int n = 10;
int& ref = n;
auto         v3 = ref;      // int        —— auto 去掉引用
decltype(ref) v4 = n;       // int&       —— 原样保留
```

> `auto` **更省心，但会丢失信息**；`decltype` **更精确，但语法啰嗦**。

---

## 五、`decltype` 的经典用法：尾置返回类型（C++11）

模板函数返回值类型依赖参数类型时，`auto` 推导不出，要用 `decltype`：

```cpp
template<typename T1, typename T2>
auto add(T1 a, T2 b) -> decltype(a + b) {
    return a + b;
}
```

`-> decltype(...)` 叫**尾置返回类型**（trailing return type）——因为参数 `a`、`b` 出现在参数列表，**返回类型里就能引用它们**。

---

## 六、C++14 之后：`decltype(auto)`

把 `decltype` 的规则直接套到变量推导上，**更简洁**：

```cpp
int       foo() { return 1; }
int&      bar() { static int x; return x; }

decltype(auto) v1 = foo();   // int
decltype(auto) v2 = bar();   // int& —— 完全按 decltype 规则
```

| | 推导规则 |
| --- | --- |
| `auto` | 抛掉顶层 const / 引用 |
| `decltype(auto)` | 完全按 `decltype` 规则推导，**保留一切** |

`decltype(auto)` 主要用在**转发函数 / 包装函数**里——返回值类型要"原样"传下去：

```cpp
decltype(auto) wrapper() {
    return foo();   // 保留 foo() 返回类型的所有修饰
}
```

---

## 七、易错点清单

1. **`decltype(x)` 和 `decltype((x))` 不一样**：变量名 vs 表达式。多一层括号差一个引用。
2. **`auto` 不会保留引用**：`auto v = ref;` 推出的是 `int`，不是 `int&`。
3. **`decltype` 不执行表达式**：`decltype(func())` 只是拿返回类型，**`func()` 不会被调用**。
4. **`decltype(auto)` 别乱用**：函数返回局部变量的引用会延长悬垂引用，**谨慎**。
5. **lambda 用 `decltype`**：lambda 类型是匿名的，`decltype([]{...})` 能拿到 lambda 的独特类型。

---

## 八、极简速记

| 写法 | 含义 |
| --- | --- |
| `decltype(变量名)` | 变量声明类型（含 const / 引用） |
| `decltype((变量名))` | 左值表达式 → `T&` |
| `decltype(右值表达式)` | 普通类型 `T` |
| `decltype(std::move(x))` | `T&&`（将亡值） |
| `decltype(auto)` | C++14 起，按 `decltype` 规则推导变量类型 |

---

## 九、小结

- `decltype` = **编译期类型查询器**，不动表达式、只拿类型；
- 核心规则 4 条：**裸名字按字面、左值加 &、纯右值不变、将亡值加 &&**；
- `auto` 简化写法但丢信息，`decltype` 精确但啰嗦；
- **`decltype(auto)`（C++14）**是两者结合的最简形式，主要用在转发返回值；
- 最经典的应用：**尾置返回类型 `auto func(...) -> decltype(...)`**。
