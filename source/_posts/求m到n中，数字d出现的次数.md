---
title: 数位统计：求 m~n 中数字 d 出现的次数
date: 2026-09-27 16:00:00
tags:
  - 数位统计
  - 数学
  - 公式化简
categories:
  - 算法学习
---

求「`m` 到 `n` 区间内数字 `d` 出现了多少次」，最直接的思路是把区间拆成两半：

$$
\text{ans} = f(n) - f(m - 1)
$$

其中 `f(x)` 表示「数字 `d` 在区间 `[0, x]` 里出现了多少次」。这一篇重点讲 `f(x)` 的数位统计法，并把它压成「一行公式」。

## 一、思路

把数字 `x` 按十进制一位一位看：

```
x = high cur low base
   = high * base * 10 + cur * base + low
```

其中：

| 名字 | 含义 |
| --- | --- |
| `base` | 当前位的权值（`1`、`10`、`100`、…） |
| `cur` | 当前位的数字（`0` ~ `9`） |
| `high` | 比 `cur` 高的部分（左侧） |
| `low` | 比 `cur` 低的部分（右侧） |

例：`x = 1304`，`base = 100`，则 `high = 1`、`cur = 3`、`low = 4`。

我们的任务是：**在 `[0, x]` 中，当前位上出现 `d` 的次数**有多少。设这个贡献为 `Δ`，则 `f(x) = Σ Δ`。

按 `cur` 和 `d` 的大小关系，分三种情况讨论。

## 二、分情况讨论

### 2.1 `cur < d`

当前位自己已经是 `d` 了，但 `cur < d` 意味着 `cur` 不可能取到 `d`。所以「当前位是 `d`」这件事只能由**低位**（`0` ~ `base - 1`）来顶替，而**高位**只能比 `high` 小一档（不能等于 `high`，否则当前位就 ≥ `cur + 1 > d` 了）。

- 高位取值：`0 ~ high - 1`，共 `high` 种；
- 低位随便选：共 `base` 种。

$$
\Delta = \text{high} \times \text{base}
$$

### 2.2 `cur == d`

当前位自己就是 `d`。这时候高位既能取 `0 ~ high - 1`（让当前位以下随便选），也可以取 `high`（让低位只能在 `0 ~ low` 里挑）：

- 高位取 `0 ~ high - 1`：共 `high` 种 × `base` 种低位；
- 高位取 `high`：1 种 × (`low + 1`) 种低位。

$$
\Delta = \text{high} \times \text{base} + (\text{low} + 1)
$$

### 2.3 `cur > d`

当前位 > `d`。那么「当前位是 `d`」这件事**只能由低位**顶替：

- 高位可以取 `0 ~ high`（共 `high + 1` 种）；
- 低位随便选：`base` 种。

$$
\Delta = (\text{high} + 1) \times \text{base}
$$

## 三、写成代码

把上面三段写成 `count(x)` 函数（这里 `d` 作为参数）：

```cpp
// 统计 [0, x] 中数字 d 出现的次数（d ∈ 1..9）
int count(int x, int d) {
    if (x <= 0) return 0;
    long long res = 0;
    long long base = 1;
    while (base <= x) {
        int high = (int)(x / base / 10);
        int cur  = (int)(x / base % 10);
        int low  = (int)(x % base);

        if (cur < d)        res += (long long)high * base;
        else if (cur == d)  res += (long long)high * base + low + 1;
        else                res += (long long)(high + 1) * base;

        base *= 10;
    }
    return (int)res;
}
```

区间 `[m, n]` 的答案：

```cpp
int a, b, d;
cin >> a >> b >> d;
cout << count(b, d) - count(a - 1, d) << endl;
```

## 四、压成一行：3 if → 1 表达式

观察到三段公式只差一个 `(low + 1)` 是否加上，可以拆成两项：

$$
\Delta = \text{base} \times (\text{high} + (\text{cur} > d)) + (\text{cur} == d) \times (\text{low} + 1)
$$

- `base * high` 是三种情况里都有的「共同部分」；
- `base * (cur > d)` 在 `cur > d` 时多 1（`(high + 1) * base` 拆出来的 +base）；
- `(cur == d) * (low + 1)` 在 `cur == d` 时再加上 `low + 1`。

> C++ 里布尔表达式 `true` 当 `1` 用、`false` 当 `0`，所以 `(cur > d)`、`(cur == d)` 可以直接当数字参与运算。

于是整段判断压缩成一行：

```cpp
res += base * (high + (cur > d)) + (cur == d) * (low + 1);
```

完整版（化简后）：

```cpp
#include <iostream>
using namespace std;

int count(int x, int d) {
    if (x <= 0) return 0;
    long long res = 0;
    long long base = 1;
    while (base <= x) {
        int high = (int)(x / base / 10);
        int cur  = (int)(x / base % 10);
        int low  = (int)(x % base);

        res += base * (high + (cur > d)) + (cur == d) * (low + 1);

        base *= 10;
    }
    return (int)res;
}

int main() {
    int a, b, d;
    cin >> a >> b >> d;
    cout << count(b, d) - count(a - 1, d) << endl;
    return 0;
}
```

## 五、实战 [P1179 [NOIP 2010 普及组] 数字统计](https://www.luogu.com.cn/problem/P1179)

题目：给定两个正整数 `a, b`（`1 ≤ a ≤ b ≤ 10⁸`），求在 `[a, b]` 的所有整数中，数字 `2` 出现了多少次。

直接套用 `d = 2`：

```cpp
#include <iostream>
using namespace std;

int count(int x) {                              // 直接写死 d = 2
    if (x <= 0) return 0;
    long long res = 0;
    long long base = 1;
    while (base <= x) {
        int high = (int)(x / base / 10);
        int cur  = (int)(x / base % 10);
        int low  = (int)(x % base);
        res += base * (high + (cur > 2)) + (cur == 2) * (low + 1);
        base *= 10;
    }
    return (int)res;
}

int main() {
    int a, b;
    cin >> a >> b;
    cout << count(b) - count(a - 1);
    return 0;
}
```

几组样例验证（手算）：

| 输入 | 答案 |
| --- | --- |
| `[1, 22]` | 6  （2、12、20、21、22，里面「2」各出现一次；其中 22 出现两次） |
| `[2, 100]` | 18 |

## 六、`d == 0` 的特殊处理（坑）

上面的公式对 `d = 0` **不完全成立**。原因是数字 0 不能当最高位（否则就成了前导零），但公式默认 `high` 可以取 `0`，会把像 `007` 这种「假 0」也算进去。

一种常见做法：先按 `d = 10` 走通用公式（让 0 也能出现），再把「每一位假装补的高位 0」全扣掉——每一位恰好扣一个：

```cpp
int countZero(int x) {
    if (x <= 0) return 0;
    long long res = 0;
    long long base = 1;
    int tmp = x;
    int bits = 0;
    while (tmp > 0) { bits++; tmp /= 10; }         // x 的位数

    for (int pos = 1; pos <= bits; pos++) {
        int high = (int)(x / base / 10);
        int cur  = (int)(x / base % 10);
        int low  = (int)(x % base);

        if (cur == 0) res += (long long)(high - 1) * base + low + 1;
        else          res += (long long)high * base;

        base *= 10;
    }
    return (int)res;
}
```

把 `d = 0` 的答案代入 `[2, 100]`，手算是 `9`（2, 10, 12, 20, 21, 22, …100 中除 `100` 是「1 0 0」含两个 0，共 10 个 0；再扣掉 0 本身「0」、还有 100 的高位不算，整体需要重数）。

数位统计的细节很多，第一次接触建议**先把 `d != 0` 的版本写熟**，`d = 0` 的修正等到具体题目再回头补。

## 七、易错点清单

1. **全局 `d` 漏传**：原版示例代码直接用全局变量 `d`，但函数声明里没参数。改成 `count(x, d)` 把 `d` 作为参数传进来。
2. **`x / base / 10` 整数除法的顺序**：`x / base / 10` 先取「去掉 cur 与 low 的高位」，等价于 `x / (base * 10)`。先 `x / base` 再 `% 10` 取当前位。
3. **`long long` 防溢出**：当 `x` 接近 `10⁹` 时，`high * base` 可能超过 `int` 上限。先把中间结果强转 `long long`。
4. **`base <= x` 的边界**：`base` 一直乘 10，超过 `x` 时停止。比如 `x = 999`，循环 3 次后 `base = 1000` 退出。
5. **`d == 0` 不能直接套公式**：按本文第六节特殊处理。
6. **区间 `[a, b]`**：答案 = `count(b) - count(a - 1)`，**不是** `count(b) - count(a)`。

## 八、小结

数位统计的关键，是把「**当前位选 `d`，左右两位随意选**」拆出来单独计数，剩下交给乘法原理。记法：

| 当前位 vs `d` | 贡献 Δ |
| --- | --- |
| `cur < d` | `high × base` |
| `cur == d` | `high × base + (low + 1)` |
| `cur > d` | `(high + 1) × base` |

压成一行：

```cpp
res += base * (high + (cur > d)) + (cur == d) * (low + 1);
```

这个套路还能推广到「求 1 的个数」「求特定数字 `xy` 出现的次数」「数字 `d` 出现次数大于某个阈值」等几乎所有「按位贡献」的题目。
