---
title: STM32 入门笔记 01：从点亮一颗 LED 到能看懂固件库
date: 2026-09-27 18:00:00
tags:
  - STM32
  - 嵌入式
  - GPIO
  - C
categories:
  - 嵌入式学习
series: STM32 入门笔记
---

这一篇是 STM32 入门笔记专栏的第一篇，覆盖「点亮一颗 LED」用到的全部固件库调用，再把容易踩坑的几个细节——GPIO 8 种模式、`SetBits`/`ResetBits` 的方向、固件库自带的别名——串成一张能用得上的清单。

> **约定**：除非另说，文里所有示例都是基于 **STM32F103 标准外设库**（也叫「标准库 / 固件库 v3.5」），对应江科大 / 江协科技入门课程那种「寄存器+库函数」混讲的版本。CubeMX / HAL 库的 API 名不一样（`HAL_GPIO_WritePin` 等），但物理意义是一致的。

## 一、点亮一颗 LED 的最小步骤

以 PC13 引脚接的一颗 LED 为例（很多最小系统板上 PC13 是板载 LED），点亮它要干三件事：

1. 打开 GPIOC 外设的时钟；
2. 把 PC13 配置成「推挽输出」模式；
3. 把 PC13 输出低电平（**注意：**很多板载 LED 是低电平点亮的，见下文）。

### 1.1 开时钟

STM32 上外设默认是关时钟的（为了省电），用之前必须先开：

```c
RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOC, ENABLE);
```

`RCC_APB2PeriphClockCmd` 是标准库提供的「开 / 关某条 APB2 总线上的外设时钟」的函数，第一个参数选外设（`RCC_APB2Periph_GPIOA`、`_GPIOB`、`_GPIOC` 等），第二个参数是 `ENABLE` 或 `DISABLE`。

> 经验：所有 `RCC_APBxxxPeriphClockCmd` 都是这一步，**没开时钟就操作外设寄存器是无效的**，而且 LED 不亮也常常是这个忘了。

### 1.2 配置 GPIO 模式

GPIO 的模式用结构体配置：

```c
GPIO_InitTypeDef GPIO_InitStructure;                 // 定义结构体

GPIO_InitStructure.GPIO_Mode  = GPIO_Mode_Out_PP;     // 模式：通用推挽输出
GPIO_InitStructure.GPIO_Pin   = GPIO_Pin_13;          // 端口：13 号
GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;    // 输出速度：50 MHz

GPIO_Init(GPIOC, &GPIO_InitStructure);               // 应用到 GPIOC
```

几个字段的含义：

| 字段 | 取值（常见） | 含义 |
| --- | --- | --- |
| `GPIO_Mode` | `GPIO_Mode_Out_PP` / `Out_OD` / `AF_PP` / `AF_OD` / `AIN` / `IN_FLOATING` / `IPD` / `IPU` | 8 种输入 / 输出模式之一 |
| `GPIO_Pin` | `GPIO_Pin_x` 或 `GPIO_Pin_All` 或 `GPIO_Pin_0 \| GPIO_Pin_1 \| ...` | 要配置的引脚 |
| `GPIO_Speed` | `GPIO_Speed_2MHz` / `10MHz` / `50MHz` | 输出驱动能力；输入模式可任意填 |

### 1.3 输出电平

两种写法等价——直接用「置位 / 复位」：

```c
GPIO_SetBits(GPIOC, GPIO_Pin_13);      // 输出高电平（1）
GPIO_ResetBits(GPIOC, GPIO_Pin_13);    // 输出低电平（0）
```

或者用「写一位」：

```c
GPIO_WriteBit(GPIOA, GPIO_Pin_0, Bit_SET);    // PA0 输出高电平
GPIO_WriteBit(GPIOA, GPIO_Pin_0, Bit_RESET);  // PA0 输出低电平
```

`Bit_SET` 对应 `1`（高电平），`Bit_RESET` 对应 `0`（低电平），**不要写反**。

## 二、GPIO 的 8 种模式

STM32 的每个 GPIO 引脚都可以独立配置成下面 8 种模式之一，由 `GPIO_InitStructure.GPIO_Mode` 指定：

| 类别 | 模式名 | 特点 |
| --- | --- | --- |
| 输出 | `GPIO_Mode_Out_PP`（推挽输出） | 高低电平都有驱动能力（≈ 20 mA），可以直接点亮 LED、驱动数字芯片 |
| 输出 | `GPIO_Mode_Out_OD`（开漏输出） | **高电平没有驱动能力**（相当于悬空），低电平有；常用于 I²C 总线、电平转换 |
| 复用 | `GPIO_Mode_AF_PP`（复用推挽） | 外设接管引脚（USART TX、SPI 等）需要输出时选这个 |
| 复用 | `GPIO_Mode_AF_OD`（复用开漏） | 外设接管引脚但需要开漏特性（如 I²C 的 SDA/SCL） |
| 输入 | `GPIO_Mode_AIN`（模拟输入） | 给 ADC 用，关掉所有数字功能 |
| 输入 | `GPIO_Mode_IN_FLOATING`（浮空输入） | 不上拉也不下拉，电平完全由外部决定 |
| 输入 | `GPIO_Mode_IPU`（上拉输入） | 内部上拉到 VDD，默认高电平 |
| 输入 | `GPIO_Mode_IPD`（下拉输入） | 内部下拉到 VSS，默认低电平 |

> **记忆口诀**：推挽高低都能驱动、开漏只能拉低（要外部上拉才能得到高电平）；输入先想「默认电平是什么」再选浮空 / 上拉 / 下拉。

## 三、Keil 工程里加自定义库（以 Delay.h 为例）

江协教程里第 3-2 节讲如何把自写的 `Delay.h` / `Delay.c` 加进工程，步骤分两步：

### 3.1 把库文件加进工程（Groups + Files）

1. 在 Keil 左侧 Project 窗口**右键 → Add Group**，新建一个分组，比如 `User`；
2. 右键新建的分组 → **Add Existing Files to Group 'User'**，选你的 `Delay.h` 和 `Delay.c` 加进去。

> ❗**很多人漏的一步**：必须把 `Delay.c` 加进 Groups 才能被编译；只把 `.h` 加进头文件路径是不够的——编译器找不到实现。

### 3.2 把头文件路径加进 Include Paths

否则 `#include "Delay.h"` 会找不到文件：

1. 点工具栏的「魔术棒」按钮 → **C51**（或 **C/C++**）选项卡；
2. 找到 **Include Paths** 旁边的 `...` 按钮；
3. 点 **Folder Setup** 上方的 **New (Insert)**，把你 `Delay.h` 所在的目录加进去。

加完路径之后，`main.c` 里 `#include "Delay.h"` 就能编译了。

## 四、一段流水灯实战

把多个引脚一起初始化、用 `GPIO_Write` 一次性写 16 位的值，可以做出「流水灯」效果。下面代码让 PA0 ~ PA5 上的 6 颗 LED 依次点亮：

```c
#include "stm32f10x.h"
#include "Delay.h"

int main(void)
{
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE);

    GPIO_InitTypeDef GPIO_InitStructure;
    GPIO_InitStructure.GPIO_Mode  = GPIO_Mode_Out_PP;
    GPIO_InitStructure.GPIO_Pin   = GPIO_Pin_All;       // PA0~PA15 全部
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(GPIOA, &GPIO_InitStructure);

    while (1)
    {
        GPIO_Write(GPIOA, ~0x0001);   // 0000 0000 0000 0001  →  PA0 点亮
        Delay_ms(500);
        GPIO_Write(GPIOA, ~0x0002);   // 0000 0000 0000 0010  →  PA1 点亮
        Delay_ms(500);
        GPIO_Write(GPIOA, ~0x0004);   // 0000 0000 0000 0100  →  PA2 点亮
        Delay_ms(500);
        GPIO_Write(GPIOA, ~0x0008);   // 0000 0000 0000 1000  →  PA3 点亮
        Delay_ms(500);
        GPIO_Write(GPIOA, ~0x0010);   // 0000 0000 0001 0000  →  PA4 点亮
        Delay_ms(500);
        GPIO_Write(GPIOA, ~0x0020);   // 0000 0000 0010 0000  →  PA5 点亮
        Delay_ms(500);
    }
}
```

几个细节：

- `GPIO_Write(port, value)` 一次写 16 位：`value` 的低 16 位对应 `PA0` ~ `PA15`，高 16 位被忽略。
- `~0x0001` 取反后变成 `0xFFFE`，二进制 `1111 1111 1111 1110`，只有 PA0 是 0 —— **约定 LED 是低电平点亮**。如果你的板子是「高电平点亮」，直接写 `0x0001` 即可。
- `Delay.h` 里要实现 `Delay_ms(uint16_t ms)`，常用 SysTick 定时器做。

## 五、多引脚一起初始化

`GPIO_Pin` 字段是「位掩码」，可以用 `|` 同时选多个引脚：

```c
GPIO_InitStructure.GPIO_Pin = GPIO_Pin_0 | GPIO_Pin_1 | GPIO_Pin_2;   // PA0/PA1/PA2
GPIO_InitStructure.GPIO_Pin = GPIO_Pin_All;                            // PA0~PA15 全部 16 个
```

注意：`GPIO_Pin_All` 在标准库里就是 `0xFFFF`（即 `GPIO_Pin_0 | GPIO_Pin_1 | ... | GPIO_Pin_15`），用来一次配置整组端口很方便。

## 六、读电平

读引脚有两种语义完全不同的函数：

| 函数 | 含义 | 典型用途 |
| --- | --- | --- |
| `GPIO_ReadInputDataBit(GPIOB, GPIO_Pin_1)` | 读 **外部** 灌进来的电平 | 按键（GND 端按下时返回 0） |
| `GPIO_ReadOutputDataBit(GPIOB, GPIO_Pin_1)` | 读 **自己刚刚写出去** 的电平 | LED 翻转前先看看现在是亮还是灭 |

> 经验：按键几乎都是 `GPIO_ReadInputDataBit == 0` 判断「按下」（因为按键一端接地）；翻转 LED 用 `GPIO_ReadOutputDataBit`，不要拿错函数名。

## 七、C 语言数据类型（stdint ↔ STM32 别名对照）

STM32 标准库里把 `<stdint.h>` 的几个固定宽度类型重新定义了「`s8` / `u8`」这种短别名，写库代码时两种名字都能用：

| stdint 关键字 | STM32 别名（`inttypes.h` / `stdint.h`） | 位宽 | 范围 |
| --- | --- | --- | --- |
| `int8_t`   | `s8`  | 8  | −128 ~ 127 |
| `int16_t`  | `s16` | 16 | −32 768 ~ 32 767 |
| `int32_t`  | `s32` | 32 | −2 147 483 648 ~ 2 147 483 647 |
| `int64_t`  | `s64` | 64 | −9.22 × 10¹⁸ ~ 9.22 × 10¹⁸ |
| `uint8_t`  | `u8`  | 8  | 0 ~ 255 |
| `uint16_t` | `u16` | 16 | 0 ~ 65 535 |
| `uint32_t` | `u32` | 32 | 0 ~ 4 294 967 295 |
| `uint64_t` | `u64` | 64 | 0 ~ 1.84 × 10¹⁹ |

实用建议：

- 单片机里**优先用 `uint8_t` / `uint16_t` / `uint32_t`**——明确位宽、不会被编译器弄成 `long` 还是 `int` 看心情；
- `s8` / `u8` 这类短别名只在**写库**或**写驱动程序**时常见，**应用代码**里最好用 `uint8_t` 让人一眼看清范围；
- `int64_t` 在 Cortex-M3 上**没有原生支持**，乘除会很慢，需要时再上。

## 八、容易踩的坑清单

1. **没开时钟就操作寄存器**：LED 不亮的最常见原因。`RCC_APB2PeriphClockCmd(..., ENABLE)` 一定不能漏。
2. **`SetBits` / `ResetBits` 与高低电平对应反**：标准库下 `SetBits` 是「写 1 → 输出高」，`ResetBits` 是「写 0 → 输出低」。**如果板子 LED 是低电平点亮，要用 `ResetBits`，不能用 `SetBits`**。
3. **`Bit_SET` / `Bit_RESET` 写反**：跟上面同理，`Bit_SET == 1`（高），`Bit_RESET == 0`（低）。
4. **`GPIO_Mode_Out_OD` 输出「高电平」其实没驱动**：开漏模式下写 1 实际是把引脚「释放」，电平由外部上拉决定。需要驱动 LED / 大电流负载必须用推挽 (`Out_PP`)。
5. **没把 `.c` 加进 Groups 只加了头文件路径**：自定义库不参与编译，链接时报 undefined。
6. **头文件路径加错**：魔术棒里那个 `Include Paths` 加的是**目录**，不是文件本身；而且只对 `<...>` / `"..."` 的 `#include` 生效，对源码中相对路径 `include` 不一定生效。
7. **`GPIO_Pin_All` 跟 `GPIO_Pin_x | GPIO_Pin_y` 混用时重复**：位掩码重复不会报错，但建议每次都重新初始化一遍结构体，避免上一次调用残留字段。
8. **板载 LED 的电平约定**：很多最小系统板（比如经典的蓝色小 STM32F103C8T6 板子）上 LED 是 **PC13 低电平点亮**——`GPIO_ResetBits` 才会亮，`GPIO_SetBits` 会灭。要先查原理图，不要照抄别人的代码。
9. **`GPIO_Write` 一次写 16 位**：传入的 16 位以上的位会被忽略；如果你想让 PA0~PA15 同时动作，用 `GPIO_Write`，而不是循环里写 16 次 `WriteBit`。
10. **烧录完没跑起来**：先按一下板子上的 **RESET 按钮**，很多情况下不是代码问题而是「板子正在跑旧程序」或者「BOOT0 跳线帽位置不对」。

## 九、tip: 烧录程序没跑起来

按以下顺序排查：

1. **按一下板子上的 RESET 按钮**——很多时候就是板子卡在旧程序；
2. **看 LED 指示灯**——电源灯（一般红色）常亮说明供电 OK；如果电源灯不亮就检查 USB 线 / 5V 跳线帽；
3. **看 Keil 下载信息**——是不是显示「Verify OK」？如果 Verify 失败，多半是 BOOT0 跳线帽没在「程序运行」位（一般是低电平）；
4. **最小化测试**——把所有逻辑删掉，只保留 `while(1);` 然后烧录。如果还跑不起来就是工程配置问题；如果跑起来了再把代码一点点加回去；
5. **观察 GPIO 输出**——用万用表量关键引脚，看是不是真有你想要的电平——很多「灯不亮」其实是 GPIO 没输出。

## 十、小结

点亮 LED 这件小事，把 STM32 嵌入式开发的「**三件套**」都走了一遍：

1. **开时钟**（`RCC_APBxxxPeriphClockCmd`）——所有外设使用前的固定动作；
2. **配置模式**（`GPIO_Init`）——结构体三件套：`Mode` / `Pin` / `Speed`；
3. **操作电平**（`SetBits` / `ResetBits` / `Write` / `ReadXxx`）——记清楚「`Set` = 高，`Reset` = 低」。

接下来要学任何新外设（USART、SPI、I²C、TIM、ADC），套路都是一样的——开时钟 → 用结构体初始化 → 调用收 / 发函数。把 GPIO 这套流程练熟，其它外设上手就快了。

---

> **下一篇**：{% post_link stm32-02-oled "02 OLED 显示屏与硬件接线注意" %}
> 完整专栏目录见 {% post_link stm32-series-index "STM32 入门笔记（专栏索引）" %}。
