---
title: C++ Lambda 表达式（匿名函数）：写临时小函数的「快捷方式」
date: 2026-10-12 22:00:00
tags:
  - C++
  - Lambda
  - STL
  - 算法竞赛
categories:
  - C++学习
---

Lambda 表达式就是一个**当场写、当场用、不用起名字**的小函数。在 `sort`、`for_each`、STL 容器遍历里写回调非常方便，比单独写全局函数或仿函数更紧凑。

## 一、完整语法

```cpp
[捕获列表](参数列表) mutable -> 返回值类型 { 函数体 };
```

拆成 5 部分：

| 位置 | 名称 | 说明 |
| --- | --- | --- |
| `[]` | 捕获列表 | 把外面变量抓到 lambda 内部使用（最核心、最容易踩坑） |
| `()` | 参数列表 | 和普通函数参数一样 |
| `mutable` | 可选 | 允许修改「值捕获」的副本 |
| `-> 类型` | 尾置返回类型 | 可选，大部分情况编译器能自动推导 |
| `{}` | 函数体 | 真正执行的代码 |

> 大括号后面的分号 `;` 不要漏——lambda 整体是一个表达式，表达式必须以分号结尾。

## 二、捕获列表（最核心、最容易踩坑）

| 写法 | 含义 |
| --- | --- |
| `[]` | 不捕获任何外部变量 |
| `[=]` | **值捕获**：复制一份进 lambda，只读；加 `mutable` 才能改副本，但**不会改原值** |
| `[&]` | **引用捕获**：全部变量引用，lambda 内修改会**直接改动原值** |
| `[x]` | 只值捕获 `x` |
| `[&x]` | 只引用捕获 `x` |
| `[=, &x]` | 默认全部值捕获，唯独 `x` 用引用捕获 |
| `[this]` | 类内使用，捕获当前对象的 `this` 指针 |

> **大坑**：引用捕获不要捕获生命周期已经结束的变量（比如函数局部变量），如果 lambda 延迟执行、变量已经销毁，就会变成**悬垂引用**，访问直接未定义行为。

## 三、示例 1：基础 sort（竞赛最常用）

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> a = {3, 1, 4, 2};
    // lambda 作为 sort 的比较函数：从大到小排序
    sort(a.begin(), a.end(), [](int x, int y) {
        return x > y;
    });
    for (auto num : a) cout << num << ' ';
    return 0;
}
```

输出：

```
4 3 2 1
```

## 四、示例 2：捕获外部变量

```cpp
#include <iostream>
using namespace std;

int main() {
    int limit = 10;
    // 值捕获 limit
    auto f = [=](int x) {
        return x < limit;
    };
    cout << f(5);    // 输出 1（5 < 10）
    return 0;
}
```

## 五、示例 3：`mutable` 演示

```cpp
#include <iostream>
using namespace std;

int main() {
    int a = 1;
    auto f = [=]() mutable {
        a++;          // 不加 mutable 编译报错！改的只是副本
        cout << a << endl;
    };
    f();              // 副本里 a 变成 2
    cout << a;         // 外面原值仍然是 1
    return 0;
}
```

输出：

```
2
1
```

## 六、示例 4：引用捕获

```cpp
#include <iostream>
using namespace std;

int main() {
    int a = 1;
    auto f = [&]() {
        a++;          // 直接修改外面原始变量
    };
    f();
    cout << a;         // 输出 2
    return 0;
}
```

## 七、存储 lambda：`auto` 与 `std::function`

lambda 的类型是**匿名的独特类型**，不能直接写类型名。一般两种存法：

- **直接 `auto`**：最常用、最推荐。
- **`std::function`**：需要把 lambda 当成「可调用对象」在函数之间传来传去时用。

```cpp
#include <iostream>
#include <functional>
using namespace std;

int main() {
    function<int(int)> f = [](int x) { return x * x; };
    cout << f(3);        // 输出 9
    return 0;
}
```

## 八、易错点清单

1. **`[&]` 大范围引用捕获要慎用**。lambda 内部会"延长"被引用变量的生命周期错觉——其实是悬垂引用。一旦原变量被销毁，lambda 内访问直接未定义行为。
2. **`mutable` 只对「值捕获」的副本生效**。引用捕获本来就是原变量，加不加 `mutable` 都能改。
3. **没写返回类型，编译器推导不出来**时，lambda 会推导成 `void`。比如函数体只有一条 `return x * x;`（多分支）的情况，最好显式写 `-> int`。
4. **捕获 `this` 后对象生命周期**：lambda 内访问成员依赖原对象存活。如果 lambda 被存起来跨函数使用，原对象提前销毁就会出 bug。

## 九、极简速记

| 场景 | 推荐写法 |
| --- | --- |
| 只读访问外部变量 | `[=]` |
| 修改外部变量 | `[&]`（慎用，注意生命周期） |
| sort 自定义排序 | `sort(..., [](a,b){ return a > b; })` |
| 函数间传递 | `std::function<R(Args...)>` |
| 存储局部 lambda | `auto f = [...](){...};` |

## 十、小结

- Lambda 是**匿名函数**，当场写当场用，代码紧凑；
- **捕获列表**是核心：`[=]` 只读、`[&]` 可改原值；
- 优先用 `auto`，需要跨函数传递再考虑 `std::function`；
- C++11 引入，**蓝桥杯 / 信奥 / 洛谷编译器全部支持**。
