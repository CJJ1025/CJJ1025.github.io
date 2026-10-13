---
title: C++ STL 速查：容器、适配器与配对类型
date: 2026-10-12 23:20:00
tags:
  - C++
  - STL
  - 容器
  - 算法竞赛
categories:
  - C++学习
---

STL（Standard Template Library，标准模板库）= 容器 + 算法 + 迭代器 + 仿函数 + 配对类型。这一篇**只整理容器与配对类型**——按"序列 / 关联 / 无序 / 配对"分组，每种给最常用接口 + 易错点。

---

## 一、`vector`：动态数组

头文件：`<vector>`

`std::vector<T>` 是**动态可变长的顺序容器**，底层**单一整块连续内存**。

### 1.1 `insert` vs `emplace`：少一次拷贝

```cpp
#include <iostream>
#include <vector>
using namespace std;

struct Student {
    int id;
    string name;
    Student(int i, string n) : id(i), name(n) {
        cout << "构造 Student\n";
    }
    Student(const Student& s) {
        cout << "拷贝构造 Student\n";
    }
};

int main() {
    vector<Student> v;

    // 需要先构造临时 Student，再拷贝进 vector
    v.insert(v.begin(), Student(1, "A"));
    // 输出：构造 Student → 拷贝构造 Student

    // 直接在 vector 内存原地构造，无拷贝！
    v.emplace(v.begin(), 2, "B");
    // 输出：构造 Student
    return 0;
}
```

> **能用 `emplace` 就用 `emplace`**，把参数直接转发给元素构造函数，少一次拷贝。

### 1.2 常用接口速记

| 接口 | 作用 |
| --- | --- |
| `push_back(x)` / `emplace_back(args...)` | 尾部添加 |
| `pop_back()` | 尾部删除 |
| `insert(pos, x)` / `emplace(pos, args...)` | 在 `pos` 前插入 |
| `erase(pos)` / `erase(first, last)` | 删除元素 / 区间 |
| `size()` / `empty()` / `clear()` | 大小 / 判空 / 清空 |
| `front()` / `back()` | 首 / 尾元素引用 |
| `begin()` / `end()` / `rbegin()` / `rend()` | 迭代器 |
| `resize(n)` / `reserve(n)` | 改大小 / 预分配 |

---

## 二、`deque`：双端队列

头文件：`<deque>`

底层是**分段多块内存**，逻辑上连续。**头尾增删都是 O(1)**，比 `vector` 多了一个 `push_front` / `pop_front`。

```cpp
deque<int> dq;

// 头尾增删 O(1)
dq.push_back(10);     // 尾部添加
dq.push_front(20);    // 头部添加（vector 没有 push_front）
dq.pop_back();
dq.pop_front();

// 随机访问
dq[0];
dq.at(0);             // 越界会抛异常

// 任意位置插入删除 O(n)
dq.insert(dq.begin(), 66);
dq.erase(dq.begin());

// emplace 原地构造
dq.emplace_back(99);
dq.emplace_front(88);

// 迭代器
dq.begin(), dq.end();
dq.rbegin(), dq.rend();

dq.size(); dq.empty(); dq.clear();
```

### 2.1 `vector` vs `deque`

| 特性 | `vector` | `deque` |
| --- | --- | --- |
| 内存 | 单一整块连续 | 分段多块内存，逻辑连续 |
| `push_back` | O(1)（偶尔扩容 O(n)） | O(1) |
| `push_front` | ❌ 不支持，O(n) | ✅ O(1) |
| 随机访问 `[]` | ✅ 极快 | ✅ 可以，略慢 |
| 中间 `insert`/`erase` | O(n) | O(n) |
| 扩容代价 | 高，全部元素拷贝 | 低，只新增内存块 |
| 迭代器失效 | 扩容全部失效；删除只失效被删点及之后 | 头尾插入一般不失效；中间插入失效部分 |
| 内存碎片 | 容易产生 | 相对好一点 |

### 2.2 容器适配器底层

`stack`、`queue` 默认底层容器就是 `deque`：

```cpp
queue<int> q;         // 底层 deque
stack<int> st;        // 底层 deque
```

> 滑动窗口、单调队列、双端 BFS——这些**洛谷 / 蓝桥杯常考场景**里，`deque` 比 `vector` 顺手得多。

---

## 三、关联容器：`map` / `set`（红黑树）

### 3.1 `std::map`：有序 key-value 表

头文件：`<map>`

`std::map<Key, T>` 是**有序关联容器**，底层是**红黑树（平衡二叉搜索树）**。

#### 核心特点

1. **key 唯一**：同一 key 重复插入会被忽略（不会新增，但**会覆盖 value**）；
2. **自动有序**：默认按 `key` 升序（`less<Key>`）；
3. 查找 / 插入 / 删除：$O(\log n)$；
4. 存储单元是 `pair<const Key, T>`，**key 是 `const`，不能直接修改**（会破坏树结构）；
5. 支持**双向迭代器**，**不支持随机访问**（不能用 `[整数]` 当数组下标）。

#### 常用接口

```cpp
#include <iostream>
#include <map>
using namespace std;

int main() {
    map<string, int> mp;

    // 插入
    mp["apple"] = 10;                // [] 如果 key 不存在会自动插入
    mp.insert({"banana", 20});
    mp.emplace("orange", 30);        // 原地构造 pair，减少拷贝

    // 查找
    auto it = mp.find("apple");
    if (it != mp.end()) {
        cout << it->first << " " << it->second << endl;
    }

    // count：判断 key 是否存在，返回 0 或 1（map key 唯一）
    if (mp.count("banana")) cout << "存在\n";

    // 删除
    mp.erase("apple");               // 按 key 删
    mp.erase(it);                    // 按迭代器删

    // 遍历
    for (auto& p : mp) {
        cout << p.first << " : " << p.second << endl;
    }

    mp.size(); mp.empty(); mp.clear();
    return 0;
}
```

#### ⚠️ 重点坑：`[]` 运算符

```cpp
int val = mp["grape"];     // "grape" 不存在 → 自动插入这个 key！
```

> 如果你只想查询，**用 `.find()` 不用 `[]`**，避免意外插入元素。

#### `insert` vs `emplace`

- `insert`：传入已经构造好的 `pair`，会拷贝 / 移动；
- `emplace`：直接传 `key, val` 参数，原地构造 `pair<const Key, T>`，少一次临时对象：

```cpp
mp.insert(make_pair("a", 1));
mp.emplace("a", 1);        // 推荐
```

### 3.2 `std::set`：有序集合

头文件：`<set>`

`std::set<T>` 是**有序集合**，底层红黑树，元素**唯一不可重复**。

#### 核心特点

1. 只存**单个值**（不是 key-value），元素不重复；插入重复值**直接忽略，不会报错**；
2. 默认**升序**排列（`less<T>`）；
3. 元素是 `const`，**不能直接修改迭代器指向的值**——会破坏红黑树有序性；想改：删旧插新；
4. 双向迭代器，**不支持随机访问，没有 `[]`**。

#### 常用接口

```cpp
#include <iostream>
#include <set>
using namespace std;

int main() {
    set<int> st;
    st.insert(5);
    st.insert(3);
    st.insert(5);               // 重复，无效
    st.emplace(7);              // 原地构造

    // 遍历：自动有序输出
    for (auto x : st) cout << x << " ";    // 3 5 7

    auto it = st.find(5);
    if (it != st.end()) cout << *it << endl;

    if (st.count(3)) cout << "3 存在\n";

    st.erase(3);                // 按值删除
    st.erase(it);               // 按迭代器删除

    st.size(); st.empty(); st.clear();
    return 0;
}
```

#### 取最小 / 最大

```cpp
int mn = *st.begin();     // 最小值
int mx = *st.rbegin();    // 最大值
```

### 3.3 `std::multimap` / `std::multiset`：允许 key 重复的版本

| | `map` / `set` | `multimap` / `multiset` |
| --- | --- | --- |
| key 重复 | 不允许 | 允许 |
| `[]` 运算符 | ✅ | ❌（`multimap` 没有 `[]`） |
| `erase(值)` | 只删这一个唯一元素 | **删除全部**该值 |
| `find` | 返回那个唯一元素 | 只返回**第一个**匹配 |

> `multimap` 经常需要遍历"同 key 的所有元素" → 用 `equal_range`：

```cpp
multimap<int, string> mmp;
// 插入若干 {1, "A"}, {1, "B"}, {2, "C"}...
auto range = mmp.equal_range(1);     // [起点, 终点)
for (auto i = range.first; i != range.second; ++i) {
    cout << i->second << " ";
}
```

`multiset` 同样道理，遍历同值用 `equal_range`。

---

## 四、无序容器：`unordered_map` / `unordered_set`（哈希表）

### 4.1 核心特点

| | `map` / `set` | `unordered_map` / `unordered_set` |
| --- | --- | --- |
| 底层 | 红黑树 | 哈希表 |
| 有序 | ✅ 自动升序 | ❌ 无序 |
| 复杂度 | 稳定 $O(\log n)$ | 平均 $O(1)$，最坏 $O(n)$（哈希冲突） |
| key 要求 | 支持 `<` 比较 | 需要 `hash` + `==` |
| 迭代器 | 双向 | 单向（`unordered_set` 只能 `++it`） |
| rehash | 无 | 扩容 rehash 时**全部迭代器失效** |

```cpp
#include <iostream>
#include <unordered_set>
using namespace std;

int main() {
    unordered_set<int> us;
    us.insert(5);
    us.insert(3);
    us.insert(5);                              // 重复，无效

    for (auto x : us) cout << x << " ";        // 顺序不固定！

    if (us.count(3)) cout << "存在\n";

    // 哈希表特有接口
    cout << us.bucket_count();                 // 桶数量
    cout << us.load_factor();                  // 负载因子
    return 0;
}
```

### 4.2 怎么选？

✅ 选 `map` / `set`：

1. 需要**按 key 排序输出**（蓝桥 / 洛谷经常要求按字典序输出）；
2. 数据量大，想要稳定 $O(\log n)$，不担心哈希冲突；
3. 自定义类型 key 只能 `<` 比较，不想写哈希函数。

✅ 选 `unordered_map` / `unordered_set`：

1. 只需要快速查找 / 插入 / 删除，**不在乎顺序**，追求常数级时间。

### 4.3 自定义类型哈希

自定义结构体做 key，需要**自己写哈希函数 + 等于比较**：

```cpp
struct Point { int x, y; };
struct PointHash {
    size_t operator()(const Point& p) const {
        return hash<int>()(p.x * 100000 + p.y);
    }
};
struct PointEq {
    bool operator()(const Point& a, const Point& b) const {
        return a.x == b.x && a.y == b.y;
    }
};
unordered_set<Point, PointHash, PointEq> st;
```

---

## 五、配对类型：`pair` 与 `tuple`

### 5.1 `std::pair`：打包两个值

头文件：`<utility>`

```cpp
template<class T1, class T2>
struct pair { T1 first; T2 second; };
```

#### 创建方式

```cpp
pair<int, string> p1;
p1.first = 10; p1.second = "hello";

auto p2 = make_pair(20, "abc");                // 自动推导类型
pair<int, string> p3{30, "test"};              // 列表初始化
pair<int, string> p4 = pair<int, string>(40, "em");
```

> `make_pair` 会自动推导：`auto p = make_pair(1, 2.5);` → `pair<int, double>`。

#### 自带比较运算符

**字典序比较**：先比 `first`，相等再比 `second`。

```cpp
pair<int, int> a{2, 5}, b{3, 1};
cout << (a < b);             // true，2 < 3

pair<int, int> c{2, 3}, d{2, 5};
cout << (c < d);             // true，first 相等，3 < 5
```

> 这就是为什么 `map` 内部能直接存 `pair` 当 key——红黑树就是靠 `<` 排序的。

#### 和 `map` 的关系

```cpp
map<Key, Val>  // 内部存的元素类型就是 pair<const Key, Val>
```

- `.first` → key（`const`，不能改）
- `.second` → value（可改）

```cpp
map<int, int> mp;
mp[1] = 100;
for (auto& pr : mp) {
    cout << pr.first << " " << pr.second;
    // pr.first = 2;    ❌ const，不能改
    pr.second = 200;     // ✅ value 可以改
}
```

#### 作为函数返回值

```cpp
pair<int, int> getMinMax(int a, int b) {
    if (a < b) return {a, b};
    else       return {b, a};
}

auto res = getMinMax(5, 2);
cout << res.first << " " << res.second;        // 2 5
```

#### C++17 结构化绑定

```cpp
pair<int, string> p{10, "cat"};
auto [x, y] = p;                               // 直接解包
cout << x << " " << y;
```

### 5.2 `std::tuple`：打包任意多个值

头文件：`<tuple>`

`tuple` 是 `pair` 的**泛化版本**——可以装 2、3、4……任意多个不同类型的数据。

```cpp
tuple<int, double, string> t;                  // 模板里装任意类型
```

#### 创建

```cpp
tuple<int, double, string> t1{10, 3.14, "hello"};
auto t2 = make_tuple(20, 2.718, "tuple");      // 自动推导
```

#### 取元素 `get<下标>(t)`

⚠️ **下标必须是编译期常量**——这是和 `pair` 的最大区别。

```cpp
auto t = make_tuple(10, 3.14, "hi");
cout << get<0>(t) << endl;                     // 10
cout << get<1>(t) << endl;                     // 3.14
cout << get<2>(t) << endl;                     // hi

int idx = 1;
cout << get<idx>(t);                           // ❌ 编译报错，idx 是运行期变量
```

> 因为 tuple **不能像数组那样用变量下标遍历**——编译期特性。

#### C++17 结构化绑定（推荐）

```cpp
auto t = make_tuple(10, 3.14, "hi");
auto [a, b, c] = t;                            // 直接解包
cout << a << " " << b << " " << c;
```

#### 比较运算符

tuple 自带 `== < > <= >=`，**字典序比较**：

```cpp
tuple<int, int> t1{1, 5}, t2{2, 3};
cout << (t1 < t2);                             // true，1 < 2
tuple<int, int> t3{2, 2}, t4{2, 5};
cout << (t3 < t4);                             // true，第一个相等，2 < 5
```

> tuple 也可以放进 `set` / `map` 当 key。

#### 配套函数

```cpp
tuple<int, double, string> t = make_tuple(1, 2.0, "abc");

// 元素个数（编译期）
cout << tuple_size<decltype(t)>::value;        // 3

// 第 0 个元素的类型
tuple_element<0, decltype(t)>::type x = 10;

// tie 解包
int a; double b; string c;
tie(a, b, c) = t;                              // 把 t 的值绑定到 a/b/c

// ignore 跳过
int x; string s;
tie(x, ignore, s) = t;                         // 跳过第二个
```

### 5.3 `pair` vs `tuple`

| | `pair` | `tuple` |
| --- | --- | --- |
| 元素数量 | 固定 2 个 | 任意多个（≥1） |
| 取值 | `.first` / `.second` | `get<idx>()` 或结构化绑定 |
| 下标 | 成员名字，直观 | 必须编译期常量 |
| 场景 | 只返回两个值 | 返回 ≥ 3 个值 |

---

## 六、极简速记

| 容器 | 一句话 | 何时用 |
| --- | --- | --- |
| `vector` | 动态数组 | 默认选它，连续内存 + 随机访问 |
| `deque` | 双端队列 | 头尾频繁增删 |
| `queue` / `stack` | 队列 / 栈（默认 deque） | BFS / DFS 辅助 |
| `map` / `set` | 红黑树 key-value / 集合 | 需要**有序 + 稳定 $O(\log n)$** |
| `multimap` / `multiset` | 允许重复的 map / set | key 不唯一，需要 `equal_range` |
| `unordered_map` / `unordered_set` | 哈希表版本 | 不需要顺序，追求**常数时间** |
| `pair` / `tuple` | 异构数据打包 | 函数返回多值、set/map 复合 key |

## 七、易错点清单

1. **`map["key"]` 会自动插入**：仅查询请用 `.find()`。
2. **`set` / `map` 元素是 `const`**：不能改，要改就删旧插新。
3. **`unordered_*` 无序**：要求按 key 排序输出就别用。
4. **`unordered_*` 自定义类型要写 hash**：内置类型（int / string）自带，自定义结构体要写 `hash` + `==`。
5. **哈希冲突被卡**：`unordered_*` 在精心构造的数据下会退化到 $O(n)$，**卡常题反而用 `set` 更稳**。
6. **`multimap` 没有 `[]`**：插入用 `insert` / `emplace`。
7. **`tuple` 不能用变量下标**：`get<i>` 的 `i` 必须是编译期常量。
8. **迭代器失效**：删除 / 扩容后，老迭代器不要继续用。

## 八、小结

- STL 容器选择**根据访问模式 + 顺序需求**决定，不要一上来就 `unordered_*`；
- **红黑树版本**（`map`/`set`）稳定 $O(\log n)$、自动有序，但常数大；
- **哈希表版本**（`unordered_*`）平均 $O(1)$，但无序、有哈希冲突风险；
- `pair` 装两个值、`tuple` 装多个；**结构化绑定 `auto [a,b] = p;` 最香**；
- 涉及大量增删 + 不需要随机访问 → `deque` / `list`；否则首选 `vector`。
