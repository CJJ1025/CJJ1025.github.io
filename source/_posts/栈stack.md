---
title: 栈 stack：从零搭起一套「后进先出」的工具箱
date: 2026-09-27 14:00:00
tags:
  - C++
  - 栈
  - 数据结构
  - STL
categories:
  - C++学习
---

栈（stack）是一种「后进先出」的数据结构——想象一摞只能从顶部放、取的书，**最后放上去的最先被拿走**。这一篇把它的 API、四道经典栈题、以及延伸出来的「表达式」相关概念串成一份工具笔记。

## 一、五分钟上手：`std::stack`

栈在 C++ 标准库里只对外暴露 5 个常用接口：

| 方法 | 作用 | 是否改动栈 |
| --- | --- | --- |
| `push(x)` | 把 `x` 压到栈顶 | ✅ |
| `pop()` | 弹出栈顶（不返回值） | ✅ |
| `top()` | 返回栈顶元素的引用 | ❌ |
| `empty()` | 栈是否为空 | ❌ |
| `size()` | 元素个数 | ❌ |

最容易踩的坑：**`pop()` 不返回值**。要拿到栈顶值，必须先 `top()` 再 `pop()`。

```cpp
#include <iostream>
#include <stack>

int main() {
    std::stack<int> s;

    s.push(1);
    s.push(2);
    s.push(3);

    std::cout << "Top element is: " << s.top() << std::endl;   // 3

    std::cout << "Popping " << s.top() << std::endl;          // 先取再删
    s.pop();

    std::cout << "Now top is: " << s.top() << std::endl;       // 2
    std::cout << "Size: " << s.size() << std::endl;            // 2
    std::cout << "Empty? " << (s.empty() ? "yes" : "no") << std::endl;
    return 0;
}
```

`std::stack` 只是一个**适配器**，底层默认是 `deque`，也可以指定为 `vector` 或 `list`：

```cpp
std::stack<int, std::vector<int>> s2;     // 底层换成 vector
```

绝大多数题用默认 `deque` 就够了，不必纠结。

## 二、经典题型一：括号匹配 [P1739](https://www.luogu.com.cn/problem/P1739)

**题目**：给一个只含 `(` 和 `)` 的字符串，判断括号是否完全配对。

**思路**：用栈模拟「期待」。

- 遇到 `(`：压栈，相当于「期待一个 `)`」；
- 遇到 `)`：
  - 如果栈顶是 `(`，说明匹配上了，弹栈；
  - 否则（栈空 / 栈顶不是 `(`），**直接输出 `NO`**——多出的右括号永远消不掉。
- 全部跑完后栈空说明完全匹配，否则说明 `(` 多出来。

```cpp
#include <iostream>
#include <stack>
#include <string>
using namespace std;

int main() {
    string s;
    cin >> s;
    stack<char> st;
    for (char c : s) {
        if (c == '(') {
            st.push(c);
        } else if (c == ')') {
            if (st.empty() || st.top() != '(') {
                cout << "NO";
                return 0;
            }
            st.pop();
        }
    }
    cout << (st.empty() ? "YES" : "NO");
    return 0;
}
```

**易错点**：原文里 `for(int i=0;i<s.length()-1;i++)` 这种写法会把最后一个字符丢掉，对于空字符串还会变成 `size_t` 的巨大值——范围 for + 空判断是更稳的写法。

## 三、经典题型二：验证栈序列 [P4387](https://www.luogu.com.cn/problem/P4387)

**题目**：给两个长度 `n` 的排列 `a`（入栈顺序）和 `b`（期望出栈顺序），问 `b` 是不是一个合法的出栈序列。

**思路**：模拟入栈过程，**一有机会就出栈**。

- 维护 `j` 指向当前期望从 `b` 出栈的位置；
- 把 `a[i]` 一个一个压栈；每次压完立刻检查栈顶是不是 `b[j]`——是就弹栈、`j++`，循环到不能再匹配为止；
- 全部入栈完后，`j == n` 就说明 `b` 是合法出栈序列，否则不是。

**为什么这样是对的**：任何出栈动作都必须紧跟某个入栈动作，所以我们把「入栈 → 尽量匹配出栈」夹在一起模拟，不会错过任何合法的出栈时机。

```cpp
#include <iostream>
#include <stack>
#include <vector>
using namespace std;

int main() {
    int q;
    cin >> q;
    while (q--) {
        int n;
        cin >> n;
        stack<int> s;
        vector<int> a(n), b(n);
        for (int i = 0; i < n; i++) cin >> a[i];
        for (int i = 0; i < n; i++) cin >> b[i];

        int j = 0;
        for (int i = 0; i < n; i++) {
            s.push(a[i]);
            while (!s.empty() && s.top() == b[j]) {   // 尽量匹配
                s.pop();
                j++;
            }
        }
        cout << (j == n ? "Yes" : "No") << endl;
    }
    return 0;
}
```

## 四、经典题型三：后缀表达式求值 [P1449](https://www.luogu.com.cn/problem/P1449)

**后缀表达式**（逆波兰式）把运算符写在操作数之后。计算规则只有一句话：**用一个栈扫一遍表达式，遇到数压栈，遇到运算符弹两个数算一下压回去**。

洛谷 P1449 的字符串格式：用 `.` 分隔数字，运算符单字符，`@` 结尾，例如 `1.2.+3.*@` 计算 `1+2` 得 3，再乘 3，得 9。

```cpp
#include <iostream>
#include <stack>
#include <string>
using namespace std;

int main() {
    string s;
    cin >> s;
    stack<int> st;

    for (size_t i = 0; i < s.size(); i++) {
        char c = s[i];
        if (c == '@') break;
        if (c >= '0' && c <= '9') {
            int num = 0;
            while (c >= '0' && c <= '9') {           // 读完整整数
                num = num * 10 + (c - '0');
                i++;
                c = s[i];
            }
            st.push(num);
        } else {                                     // 运算符
            int a = st.top(); st.pop();              // 右操作数
            int b = st.top(); st.pop();              // 左操作数
            switch (c) {
                case '+': st.push(b + a); break;
                case '-': st.push(b - a); break;
                case '*': st.push(b * a); break;
                case '/': st.push(b / a); break;
            }
        }
    }
    cout << st.top();
    return 0;
}
```

**关键细节**：

- 弹栈顺序：**先弹的当右操作数**。表达式 `b - a`，`a` 是右侧数字，先出栈；
- 用 `while` 循环读数字，因为数字可能不止一位（`12`、`345`）；
- 用 `@` 作为终止符，不要写 `s.size() - 1` 这种 off-by-one。

## 五、经典题型四：出栈序列数 [P1044](https://www.luogu.com.cn/problem/P1044)

**题目**：1, 2, …, n 依次入栈，任何时刻可以「入栈」或「出栈」，问能得到多少种不同的出栈序列。

这就是**卡特兰数**（Catalan number）：

$$
C_n = \frac{1}{n+1}\binom{2n}{n}
$$

直接用公式：

```cpp
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    long long res = 1;
    for (int i = 1; i <= n; i++) {
        res = res * (n + i) / i;     // 计算 C(2n, n)
    }
    cout << res / (n + 1);            // 除以 n+1
    return 0;
}
```

**为什么是卡特兰数**？把入栈看作 `+1`、出栈看作 `-1`，任意时刻栈里元素数 ≥ 0，等价于从 `(0, 0)` 走到 `(2n, 0)`、不穿越 x 轴的路径数。著名的「Dyck 路径计数」，结果就是卡特兰数。`n ≤ 18` 时答案 ≤ 6564120420，`long long` 装得下。

## 六、进阶：单调栈 [P5788](https://www.luogu.com.cn/problem/P5788)

**题目**：数组 `a[1..n]`，对每个位置 `i`，求**右边第一个比 `a[i]` 大的元素的下标**。

**思路**：从右往左扫描，维护一个「**栈顶元素对应数值单调递增**」的栈，里面存下标。当处理 `i` 时：

- 栈顶 ≤ `a[i]` 的位置：在 `i` 的右边、但比 `a[i]` 小或相等，永远不会是 `a[i]` 的答案，弹掉；
- 弹完之后如果栈不为空，栈顶就是「右边第一个比 `a[i]` 大的位置」；
- 把 `i` 压栈。

```cpp
#include <iostream>
#include <stack>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n + 1);
    stack<int> s;                                  // 存下标
    vector<int> f(n + 1, 0);                       // f[i] = 右边第一个更大元素的位置
    for (int i = 1; i <= n; i++) cin >> a[i];

    for (int i = n; i >= 1; i--) {
        while (!s.empty() && a[s.top()] <= a[i]) s.pop();
        if (!s.empty()) f[i] = s.top();
        s.push(i);
    }
    for (int i = 1; i <= n; i++) cout << f[i] << ' ';
    return 0;
}
```

**为什么是对每个 `i`，栈里剩下的就是「右边第一个比 `a[i]` 大的」？** 因为我们从右往左构造这个栈，每个位置被压栈之前都已经把「比它矮的」全清掉了，所以栈顶永远是**剩余元素中值最小**的那个下标；同时栈顶也最靠右。因此栈顶恰好就是「右边第一个 ≥ 自己」的、且一定严格更大（因为等于的已被弹出）。

**复杂度**：每个元素最多入栈、出栈各一次 → **O(n)**。

单调栈套路总结：

> **「右边第一个比我大/小」**：从右往左扫，弹掉栈顶 ≤（或 ≥）自己的元素，剩下栈顶就是答案。

## 七、前缀/中缀/后缀表达式

三种记法的对应关系以 `1 + (6 + 2) * 3` 为例：

| 记法 | 别名 | 例子 | 运算符位置 |
| --- | --- | --- | --- |
| 中缀 | infix | `1 + (6 + 2) * 3` | 操作数中间（人类写法） |
| 前缀 | 波兰式 | `+ 1 * + 6 2 3` | 操作数前面 |
| 后缀 | 逆波兰式 | `1 6 2 + 3 * +` | 操作数后面 |

### 手算转换：括号法

**前缀**：先把表达式按运算顺序全加括号，然后把每个运算符**移动到对应括号的左边**，最后去括号。

```
1 + ((6 + 2) * 3)      全加括号
+ (1 * (+ (6 2) 3))     每个运算符搬到它所在括号的左边
+ 1 * + 6 2 3           去括号
```

**后缀**：同样的括号化，但把每个运算符**移动到对应括号的右边**。

```
1 + ((6 + 2) * 3)
1 ((6 2) +) (3 *) +     运算符搬到右边
1 6 2 + 3 * +           去括号
```

### 计算方法

- **前缀表达式**：**从右往左**扫描；遇到数压栈，遇到运算符弹两个数计算（左先出、右后出），结果压栈。
- **后缀表达式**：**从左往右**扫描；遇到数压栈，遇到运算符弹两个数（右先出、左后出），结果压栈。

口诀：

> 前缀：右进栈，从右往左，后弹先算。  
> 后缀：左进栈，从左往右，先弹先算。

## 八、易错点清单

1. **`pop()` 不返回值**。要 `top()` 先取再 `pop()`，或者干脆 `auto x = s.top(); s.pop();`。
2. **空栈访问 `top()` 或 `pop()` 是未定义行为**。每次访问前先 `!empty()` 判断。
3. **括号题里 `s.length()-1` 容易越界**。空字符串时 `size_t - 1` 会变成巨大值；而且会丢掉最后一个字符。用范围 for 就好。
4. **后缀表达式求值**：弹栈时**先弹的当右操作数**。`b - a` 中，`a` 是右侧的 `a`，先出栈。
5. **单调栈别忘了「等于自己」的处理**。「右边第一个更大」要弹掉 `≤`，「右边第一个更小」要弹掉 `≥`。要不要弹「等于自己」取决于题目的严格 / 非严格。
6. **卡特兰数除法方向**：先 `* (n+i)` 再 `/ i`，`n ≤ 18` 时都能整除；如果用高精度要记得消去因子。

## 九、小结

栈的核心只有一句话：**FILO（First In Last Out）**。只要把这一条背熟，所有「先进后出」「最近匹配」「最近的还没处理」的场景都能往栈上靠：

| 场景 | 触发条件 |
| --- | --- |
| 括号匹配 / 嵌套结构 | 遇到开括号压栈，遇到闭括号匹配栈顶 |
| 表达式求值 | 遇数压栈、遇运算符弹两算一 |
| 出栈序列验证 | 模拟入栈、一有机会就出栈 |
| 单调栈 | 维护单调性、找「最近一个更大 / 更小」的位置 |
| DFS / 函数调用 | 递归本身就是一个调用栈 |
