---
title: STM32 入门笔记 03：EXTI 外部中断——原理 + 对射式红外计次
date: 2026-09-27 20:00:00
tags:
  - STM32
  - EXTI
  - NVIC
  - 中断
  - 嵌入式
categories:
  - 嵌入式学习
series: STM32 入门笔记
---

> 这是 STM32 入门笔记专栏的第 03 篇。在能按键检测之后，**轮询** (`while(!key)`) 已经不够用了——本篇引入**中断**机制，让 CPU 在按键被按下时才被「打断」去处理，其它时间可以睡觉、做别的事。

## 一、为什么需要中断

想象你守在门口等快递：

- **轮询（poll）**：每秒钟起来看一眼门口有没有快递——你啥也别干了；
- **中断**：坐下来睡觉，**快递小哥敲门时再起床**——绝大多数时间都在做自己的事。

单片机里也是一样的：

- 轮询：CPU 不断读按键引脚电平，**99% 时间都是浪费**的；
- 中断：CPU 跑主循环，按键变化时**硬件自动打断 CPU**，让它先跑中断函数，处理完再回来。

STM32 的中断系统分为两层：

| 缩写 | 全称 | 作用 |
| --- | --- | --- |
| **NVIC** | Nested Vectored Interrupt Controller | 内核里的「中断总管家」，负责优先级分组、嵌套、使能 |
| **EXTI** | External Interrupt | 把 GPIO 引脚的电平变化转成「中断事件」 |

## 二、NVIC 的优先级分组

STM32 把优先级分成两类：

| 名称 | 作用 | 类比 |
| --- | --- | --- |
| **抢占优先级** | 决定「能不能打断别人」 | 任务优先级 |
| **响应优先级（子优先级）** | 当抢占相同时，谁先响应 | 同优先级任务的排队顺序 |

数值都是**越小越优先**。

STM32F103 用 `NVIC_PriorityGroupConfig()` 把「优先级位」分配给两类：

| 分组设置 | 抢占优先级位 | 响应优先级位 | 抢占可选范围 | 响应可选范围 |
| --- | --- | --- | --- | --- |
| `Group 0` | 0 | 4 | 无 | 0 ~ 15 |
| `Group 1` | 1 | 3 | 0 ~ 1 | 0 ~ 7 |
| `Group 2` | 2 | 2 | 0 ~ 3 | 0 ~ 3 |
| `Group 3` | 3 | 1 | 0 ~ 7 | 0 ~ 1 |
| `Group 4` | 4 | 0 | 0 ~ 15 | 无 |

> 实战里**绝大多数代码都用 Group 2**（2 位抢占、2 位响应）：抢占有 4 档够用，响应有 4 档够排。

## 三、EXTI 外部中断的 5 步配置

外设的初始化几乎都是一个套路——**开时钟 → 配 GPIO → 接 EXTI/AFIO → 配 EXTI → 配 NVIC**：

| 步骤 | 做什么 | 用到的 API |
| --- | --- | --- |
| 1 | 开 RCC 时钟（GPIO + AFIO） | `RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOx \| RCC_APB2Periph_AFIO, ENABLE)` |
| 2 | 配 GPIO 为「上拉输入」或「下拉输入」 | `GPIO_InitStructure.GPIO_Mode = GPIO_Mode_IPU` |
| 3 | 选择 GPIO 引脚映射到哪条 EXTI 线 | `GPIO_EXTILineConfig(GPIO_PortSourceGPIOx, GPIO_PinSourcex)` |
| 4 | EXTI 配「中断 / 事件、触发边沿」 | `EXTI_Init(&EXTI_InitStructure)` |
| 5 | NVIC 配「通道、抢占优先级、响应优先级」 | `NVIC_Init(&NVIC_InitStructure)` |

> 关键点：EXTI 线只有 `EXTI_Line0 ~ EXTI_Line15` 这 16 条（直接对应 PA0 ~ PG0、PA1 ~ PG1 ……），但每个 GPIO 端口都共用这 16 条——所以**不能同时让 PA0 和 PB0 都触发 EXTI0**。这也是为什么旋转编码器要用 A、B 两根线必须分配到不同 EXTI（如 PA0 / PA1）。

## 四、EXTI 触发方式

EXTI 可以监听下面三种边沿：

| 触发方式 | 含义 | 适用场景 |
| --- | --- | --- |
| `EXTI_Trigger_Rising` | 上升沿触发（低 → 高） | 默认低、按下去变高的按键 |
| `EXTI_Trigger_Falling` | 下降沿触发（高 → 低） | 默认高、按下去变低的按键（最常见） |
| `EXTI_Trigger_Rising_Falling` | 上升沿下降沿都触发 | 旋转编码器、按键双边沿 |

## 五、实战：对射式红外传感器计次

下面把上面 5 步走完整一遍——做一个「对射式红外传感器被遮挡一次就计数加 1」的模块：

```c
#include "stm32f10x.h"

uint16_t CountSensor_Count;     // 计数值（全局变量，方便中断里改）

/* 初始化 */
void CountSensor_Init(void)
{
    /* 1. 开时钟：GPIO 和 AFIO */
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB, ENABLE);
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_AFIO,  ENABLE);

    /* 2. 配 GPIO 为上拉输入 */
    GPIO_InitTypeDef GPIO_InitStructure;
    GPIO_InitStructure.GPIO_Mode  = GPIO_Mode_IPU;        // 上拉输入：默认高电平
    GPIO_InitStructure.GPIO_Pin   = GPIO_Pin_14;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(GPIOB, &GPIO_InitStructure);

    /* 3. 把 PB14 接到 EXTI14 */
    GPIO_EXTILineConfig(GPIO_PortSourceGPIOB, GPIO_PinSource14);

    /* 4. 配 EXTI：中断模式 + 下降沿触发 */
    EXTI_InitTypeDef EXTI_InitStructure;
    EXTI_InitStructure.EXTI_Line    = EXTI_Line14;
    EXTI_InitStructure.EXTI_LineCmd = ENABLE;
    EXTI_InitStructure.EXTI_Mode    = EXTI_Mode_Interrupt;     // 中断（不是事件）
    EXTI_InitStructure.EXTI_Trigger = EXTI_Trigger_Falling;    // 下降沿
    EXTI_Init(&EXTI_InitStructure);

    /* 5. 配 NVIC：EXTI15_10_IRQn（10~15 共用一个中断向量） */
    NVIC_InitTypeDef NVIC_InitStructure;
    NVIC_InitStructure.NVIC_IRQChannel                   = EXTI15_10_IRQn;
    NVIC_InitStructure.NVIC_IRQChannelCmd                = ENABLE;
    NVIC_InitStructure.NVIC_IRQChannelPreemptionPriority = 1;
    NVIC_InitStructure.NVIC_IRQChannelSubPriority        = 1;
    NVIC_Init(&NVIC_InitStructure);
}

/* 读计数（在主循环里调用即可） */
uint16_t CountSensor_Get(void)
{
    return CountSensor_Count;
}

/* 中断服务函数：名字必须固定为 EXTI15_10_IRQHandler */
void EXTI15_10_IRQHandler(void)
{
    if (EXTI_GetITStatus(EXTI_Line14) == SET) {   // 确认是 EXTI14 触发的
        CountSensor_Count++;
        EXTI_ClearITPendingBit(EXTI_Line14);      // 必须在末尾清中断标志！
    }
}
```

主函数里的用法：

```c
int main(void)
{
    CountSensor_Init();
    while (1) {
        uint16_t n = CountSensor_Get();
        // 把 n 显示到 OLED、串口打印……你随意
    }
}
```

## 六、中断服务函数的命名规则

STM32 标准库里中断向量是固定名字，**写错就进不了中断**：

| 中断源 | 中断函数名 |
| --- | --- |
| EXTI0 | `EXTI0_IRQHandler` |
| EXTI1 | `EXTI1_IRQHandler` |
| EXTI2 | `EXTI2_IRQHandler` |
| EXTI3 | `EXTI3_IRQHandler` |
| EXTI4 | `EXTI4_IRQHandler` |
| EXTI5 ~ EXTI9 | `EXTI9_5_IRQHandler`（共用一个） |
| EXTI10 ~ EXTI15 | `EXTI15_10_IRQHandler`（共用一个） |

所以：

- **EXTI0~4**：独立 IRQ，需要先 `if (EXTI_GetITStatus(EXTIx) == SET)` 判断；
- **EXTI5~9** 或 **EXTI10~15**：共用 IRQ，函数里**必须用 `if (EXTI_GetITStatus(...))` 区分是哪一个**。

## 七、易错点清单

1. **忘开 AFIO 时钟**：EXTI 相关的引脚映射和 remap 都要经过 AFIO，没开时钟就 `GPIO_EXTILineConfig()` 会失败。
2. **GPIO 模式配错**：如果默认电平选错（比如外部是高电平你配了上拉），按下时不会产生边沿，永远不进中断。**上拉输入**=默认高电平（按键另一端接 GND）；**下拉输入**=默认低电平（按键另一端接 VCC）。
3. **共用 IRQ 函数里没分 `if`**：`EXTI15_10_IRQHandler` 里只 `CountSensor_Count++` 不判断是 Line10 还是 Line11，会**误触发**。
4. **忘了清中断标志**：进入中断后必须 `EXTI_ClearITPendingBit(...)`，否则中断会**反复触发**——典型表现是「中断里 LED 闪一下就死机」「主循环卡死」。
5. **优先级数值写错**：NVIC 优先级是「越小越优先」，把 `PreemptionPriority = 1` 当成「1 是最低」是常见误解。
6. **`NVIC_PriorityGroupConfig` 没调用就配优先级**：分组不指定，所有中断的位含义模糊，可能抢占失败。
7. **PA0 和 PB0 想同时用 EXTI0**：**不可能**，只能用一个。建议旋转编码器用 PA0 / PA1（EXTI0 / EXTI1）这种独立 IRQ，方便调试。

## 八、小结

EXTI 5 步配置 + NVIC 优先级分组是 STM32 中断系统的骨架。看起来步骤多，但本质就是「**开时钟 → 把 GPIO 接到 EXTI 线 → 让 EXTI 选择边沿 → 让 NVIC 选择 IRQ**」四件事套在一起：

```
GPIO → AFIO → EXTI → NVIC → IRQHandler
```

下篇我们用同样的 EXTI 套路，**让旋转编码器的 A / B 两相都触发中断**，做出「拧一下旋钮就计数加减」的效果。

---

> **上一篇**：{% post_link stm32-02-oled "02 OLED 显示屏与硬件接线注意" %}　　**下一篇**：{% post_link stm32-04-rotary-encoder "04 旋转编码器与双 EXTI 中断" %}
