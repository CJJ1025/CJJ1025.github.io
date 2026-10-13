---
title: C++ std::sort：从基础排序到自定义比较函数
date: 2026-10-12 23:40:00
tags:
  - C++
  - STL
  - sort
  - 算法竞赛
categories:
  - C++学习
---

头文件：`<algorithm>`

一句话：**对 `[first, last)` 左闭右开区间排序**。

C++11 之后标准规定：`sort` 是**不稳定排序**，实现一般是 introsort（内省排序 = 快速排序 + 堆排序 + 插入排序三者结合）。时间复杂度：$O(N \log N)$。

---

## 一、函数原型

```cpp
// 版本 1：默认升序，用 < 比较
template< class RandomIt >
void sort( RandomIt first, RandomIt last );

// 版本 2：自定义比较函数 cmp
template< class RandomIt, class Compare >
void sort( RandomIt first, RandomIt last, Compare comp );
```

> ⚠️ **区间是 `[first, last)`**——包含 `first`，**不包含 `last`**。数组/vector 排序一般写 `sort(a.begin(), a.end())`。

---

## 二、基础示例

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> v = {5, 2, 9, 1, 5, 6};
    sort(v.begin(), v.end());                     // 默认从小到大（升序）
    for (auto x : v) cout << x << " ";
    // 输出：1 2 5 5 6 9
    return 0;
}
```

---

## 三、降序排序：三种写法

```cpp
vector<int> v = {5, 2, 9, 1};

// 写法 1：用 greater<int>()
sort(v.begin(), v.end(), greater<int>());

// 写法 2：lambda（竞赛最推荐，灵活）
sort(v.begin(), v.end(), [](int a, int b) {
    return a > b;
});

// 写法 3：升序排完再 reverse
sort(v.begin(), v.end());
reverse(v.begin(), v.end());
```

---

## 四、自定义比较函数 `cmp`

> **比较函数语义**：`cmp(a, b) = true` 代表 `a` 应该排在 `b` 前面。
>
> - 升序：`return a < b;`
> - 降序：`return a > b;`

### 4.1 结构体排序

```cpp
struct Node {
    int x, y;
};

int main() {
    vector<Node> arr = {{3, 1}, {1, 5}, {2, 2}};
    // 优先按 x 升序；x 相等则按 y 降序
    sort(arr.begin(), arr.end(), [](const Node& a, const Node& b) {
        if (a.x != b.x) return a.x < b.x;
        return a.y > b.y;
    });
    return 0;
}
```

### 4.2 ⚠️ 严格弱序：cmp 必须遵守的硬规则

| 规则 | 错误写法 | 后果 |
| --- | --- | --- |
| `cmp(a, a) = false` | 写成 `<=` 或 `>=` | 未定义行为，程序可能崩溃 / 乱序 |
| 不能矛盾 | `cmp(a,b)=true` 同时 `cmp(b,a)=true` | 同上 |
| 传递性 | `cmp(a,b)` 且 `cmp(b,c)` → 必须 `cmp(a,c)` | 同上 |

✅ 正确：`return a < b;` 或 `return a > b;`
❌ 错误：`return a <= b;`

```cpp
// ✅ 升序：a < b
sort(v.begin(), v.end(), [](int a, int b) { return a < b; });

// ❌ 错误：a <= b 会破坏严格弱序
sort(v.begin(), v.end(), [](int a, int b) { return a <= b; });
```

---

## 五、`stable_sort`：保留相等元素原顺序

| | `std::sort` | `std::stable_sort` |
| --- | --- | --- |
| 稳定性 | ❌ 不稳定 | ✅ 稳定 |
| 底层 | introsort（快排 + 堆排 + 插入） | 归并排序 |
| 复杂度 | $O(N \log N)$ | $O(N \log N)$，**常数更大、内存开销更高** |
| 场景 | 默认选它 | 要求"相等元素保持原顺序" |

> 蓝桥杯 / 洛谷常见的"次级排序"题，比如「先按分数排，分数相同按名字字典序」——其实直接写 `cmp` 一次拍好就行，**多数情况用不上 `stable_sort`**。

---

## 六、适用迭代器

`sort` **只支持随机访问迭代器**：

| 容器 | 能否直接 `sort` |
| --- | --- |
| `vector` / `array` / 普通数组 | ✅ |
| `deque` | ✅ |
| `list` | ❌（自带 `.sort()` 成员函数，是稳定排序） |
| `set` / `map` | ❌（本身就是有序的，不需要 sort） |

```cpp
// 普通数组用法
int a[10] = {3, 1, 4, 2};
sort(a, a + 4);              // 左闭右开：a[0]..a[3]
```

---

## 七、`pair` / `tuple` 排序

`pair` 默认**先比较 `first`，相等再比较 `second`**，自带字典序，直接丢进 `sort`：

```cpp
vector<pair<int, int>> vp = {{2, 5}, {1, 9}, {2, 3}};
sort(vp.begin(), vp.end());
// 结果：{1, 9}, {2, 3}, {2, 5}
```

`tuple` 同样自带字典序，可以直接排序（见 STL 笔记里的 `tuple` 一节）。

---

## 八、竞赛常见套路

### 8.1 多关键字排序

写一个 `cmp` 一次性排好，比如：

```cpp
// 先按 x 升序，x 相同按 y 降序
sort(arr.begin(), arr.end(), [](const Node& a, const Node& b) {
    if (a.x != b.x) return a.x < b.x;
    return a.y > b.y;
});
```

### 8.2 排序 + 二分

排序后用 `lower_bound` / `upper_bound` 在 $O(\log N)$ 内查找：

```cpp
sort(v.begin(), v.end());
auto it = lower_bound(v.begin(), v.end(), 5);      // 第一个 ≥ 5 的位置
```

### 8.3 离散化

把大数据范围映射到小下标时，先 `sort + unique + erase`：

```cpp
sort(v.begin(), v.end());
v.erase(unique(v.begin(), v.end()), v.end());      // 去重
```

---

## 九、易错点清单

1. **`cmp` 写成 `<=` / `>=`**：破坏严格弱序，UB 行为。**只用 `<` 或 `>`**。
2. **左闭右开区间写错**：`sort(a.begin(), a.end())` 才是排序整个数组，写成 `end() - 1` 会漏掉最后一个元素。
3. **`list` / `set` 直接 `sort`**：编译报错。`list.sort()` 是成员函数；`set` / `map` 本来有序，不需要 sort。
4. **大量数据忘记配 `ios::sync_with_stdio(false)`**：`sort` 本身够快，但前面读入慢，整体超时。
5. **结构体里 `operator<` 没用 `const`**：会导致 `set` / `map` / `sort` 报错或拷贝。
6. **期望稳定却用 `sort`**：相同值原顺序会变——用 `stable_sort`。

---

## 十、极简速记

| 需求 | 写法 |
| --- | --- |
| 默认升序 | `sort(v.begin(), v.end());` |
| 降序 | `sort(v.begin(), v.end(), greater<int>());` |
| 自定义排序 | `sort(v.begin(), v.end(), cmp);` |
| 稳定排序 | `stable_sort(v.begin(), v.end());` |
| 普通数组 | `sort(a, a + n);` |

## 十一、小结

- **`std::sort`** 默认 introsort，$O(N \log N)$，不稳定；
- **区间 `[first, last)`** 左闭右开，别漏元素；
- **自定义 `cmp` 用 `<` 或 `>`**，千万别写 `<=` / `>=`；
- `pair` / `tuple` 自带字典序，直接 `sort`；
- 普通数组 / `vector` / `deque` 可用，**`list` 用成员 `.sort()`**。
