---
title: STM32 入门笔记 04：旋转编码器与双 EXTI 中断
date: 2026-09-27 20:30:00
tags:
  - STM32
  - EXTI
  - 旋转编码器
  - 中断
  - 嵌入式
categories:
  - 嵌入式学习
series: STM32 入门笔记
---

> 这是 [STM32 入门笔记](/2026/09/27/stm32-zhuan-lan-suo-yin/) 专栏的第 04 篇。在会了 EXTI 之后，再用它做点「有意思」的事——**旋转编码器**：拧一下旋钮，单片机就能分辨出是「顺时针」还是「逆时针」转了一格。

## 一、什么是旋转编码器

旋转编码器是一种「拧一格、输出两相脉冲」的机电元件，常见的是 **EC11 系列**（淘宝几块钱一只）。它有 3 个引脚：**A 相、B 相、GND**（有的型号中间还多一个 C 接 VCC，按键按下才接通的「中心轴按下」功能）。

波形长相（理想情况下）：

```
A 相:  _____|‾‾‾‾|_____   上升 → 下降
B 相:  __|‾‾‾‾|_____      在 A 之前就上升
```

旋转方向不同，A、B 相谁先变化也不同：

| 旋转方向 | A 边沿时 B 的状态 |
| --- | --- |
| 顺时针 | A 上升时 B = 0；A 下降时 B = 1 |
| 逆时针 | A 上升时 B = 1；A 下降时 B = 0 |

> 推论：**只要在 A 的某个边沿（比如下降沿）触发中断，进去读 B 现在的电平**，就能判断方向。

## 二、接线约定

- **A 相 → PA0**（EXTI0，独立 IRQ，方便调试）
- **B 相 → PB0**（EXTI0，**不行**——PA0 已经占了 EXTI0）→ **改成 PA1**（EXTI1）
- **GND → GND**

旋转编码器内部一般没有上拉，所以 GPIO 配 **上拉输入**（`GPIO_Mode_IPU`），让默认电平稳定为高。

## 三、初始化：双 EXTI

A、B 两根线都要触发中断，但 PA0 和 PA1 是**两条不同的 EXTI 线**（Line0 和 Line1），所以可以分别用独立的 IRQ：

```c
#include "stm32f10x.h"

int16_t Encoder_Count;       // 当前计数值（可正可负）

void Encoder_Init(void)
{
    /* 1. 开时钟 */
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE);
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_AFIO,  ENABLE);

    /* 2. 配 GPIO：PA0、PA1 都配成上拉输入 */
    GPIO_InitTypeDef GPIO_InitStructure;
    GPIO_InitStructure.GPIO_Mode  = GPIO_Mode_IPU;
    GPIO_InitStructure.GPIO_Pin   = GPIO_Pin_0 | GPIO_Pin_1;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(GPIOA, &GPIO_InitStructure);

    /* 3. AFIO 映射：PA0 → EXTI0，PA1 → EXTI1 */
    GPIO_EXTILineConfig(GPIO_PortSourceGPIOA, GPIO_PinSource0);
    GPIO_EXTILineConfig(GPIO_PortSourceGPIOA, GPIO_PinSource1);

    /* 4. EXTI 配置：两线都双边沿触发 */
    EXTI_InitTypeDef EXTI_InitStructure;
    EXTI_InitStructure.EXTI_Line    = EXTI_Line0 | EXTI_Line1;
    EXTI_InitStructure.EXTI_LineCmd = ENABLE;
    EXTI_InitStructure.EXTI_Mode    = EXTI_Mode_Interrupt;
    EXTI_InitStructure.EXTI_Trigger = EXTI_Trigger_Rising_Falling;
    EXTI_Init(&EXTI_InitStructure);

    /* 5. NVIC：Line0 / Line1 各自独立的 IRQ */
    NVIC_InitTypeDef NVIC_InitStructure;
    NVIC_InitStructure.NVIC_IRQChannelPreemptionPriority = 1;
    NVIC_InitStructure.NVIC_IRQChannelSubPriority        = 1;
    NVIC_InitStructure.NVIC_IRQChannelCmd                = ENABLE;

    NVIC_InitStructure.NVIC_IRQChannel = EXTI0_IRQn;
    NVIC_Init(&NVIC_InitStructure);

    NVIC_InitStructure.NVIC_IRQChannel = EXTI1_IRQn;
    NVIC_Init(&NVIC_InitStructure);
}
```

## 四、中断里怎么判断方向

诀窍：**在 A 相触发时，读 B 相的电平**。

- A 下降沿时 B = 0 → 顺时针 → `Encoder_Count--`
- A 下降沿时 B = 1 → 逆时针 → `Encoder_Count++`

为什么选 A 而不是 B？因为「编码器厂商约定」是 A 相先变，跟「按钮触发」一样属于惯用手。其实**反过来也可以**，只是方向要取反。

下面给出**修正后**的代码——原文这段有几处容易踩坑的地方，我都改过来了：

```c
/* A 相（PA0）触发：下降沿时读 B（PA1）判断方向 */
void EXTI0_IRQHandler(void)
{
    if (EXTI_GetITStatus(EXTI_Line0) == SET) {      // ← 注意是 Line0
        // 简易消抖：如果两次中断间隔 < 2 ms 直接忽略
        static uint32_t lastTick = 0;
        uint32_t now = SysTick->VAL;
        if ((lastTick - now) > 0 && (lastTick - now) < 2000) {
            EXTI_ClearITPendingBit(EXTI_Line0);
            return;
        }
        lastTick = now;

        if (GPIO_ReadInputDataBit(GPIOA, GPIO_Pin_1) == 0) {
            Encoder_Count--;     // 顺时针（A 下降 + B = 0）
        } else {
            Encoder_Count++;     // 逆时针（A 下降 + B = 1）
        }
        EXTI_ClearITPendingBit(EXTI_Line0);         // ← 必须清 Line0
    }
}

/* B 相（PA1）触发：下降沿时读 A（PA0）做相反方向累加 */
void EXTI1_IRQHandler(void)
{
    if (EXTI_GetITStatus(EXTI_Line1) == SET) {      // ← 注意是 Line1
        static uint32_t lastTick = 0;
        uint32_t now = SysTick->VAL;
        if ((lastTick - now) > 0 && (lastTick - now) < 2000) {
            EXTI_ClearITPendingBit(EXTI_Line1);
            return;
        }
        lastTick = now;

        if (GPIO_ReadInputDataBit(GPIOA, GPIO_Pin_0) == 0) {
            Encoder_Count++;     // 顺时针（B 下降 + A = 0）
        } else {
            Encoder_Count--;     // 逆时针（B 下降 + A = 1）
        }
        EXTI_ClearITPendingBit(EXTI_Line1);         // ← 必须清 Line1
    }
}
```

主循环里读计数：

```c
int16_t Encoder_Get(void)
{
    int16_t tmp = Encoder_Count;
    Encoder_Count = 0;        // 读一次清零
    return tmp;
}

int main(void)
{
    Encoder_Init();
    while (1) {
        int16_t d = Encoder_Get();        // 自上次读以来转过的「+1 / -1」累加
        // 把 d 累加到一个全局值 OLED 上显示
    }
}
```

## 五、原文常见 bug 与修正对照

下面把原文代码里几处错的地方列出来对照——

| 行号 | 原文 | 问题 | 修正 |
| --- | --- | --- | --- |
| `EXTI0_IRQHandler` 里 `EXTI_GetITStatus(EXTI_Line14)` | 错把 Line14 写进 EXTI0 的中断 | EXTI0 应该是 Line0 | 改成 `EXTI_GetITStatus(EXTI_Line0)` |
| `EXTI1_IRQHandler` 里 `EXTI_ClearITPendingBit(EXTI_Line0)` | 中断函数和清标志的 Line 对不上 | 应该在 EXTI1 里清 Line1 | 改成 `EXTI_ClearITPendingBit(EXTI_Line1)` |
| `Encoder_Count^=1` | 用 XOR 实现「计数」 | `^= 1` 是 0↔1 翻转，不是 ±1 | 改成 `Encoder_Count++` / `--` |
| `NVIC_Pin = GPIO_Pin_14`（错误变量名） | 误把 GPIO 字段名写到 NVIC 结构体 | 编译都过不了 | 删掉 |
| 没消抖 | 机械触点会反复抖动 | 中断函数里短时间反复触发 | 加 2 ms 简易消抖 |

> 上面这些 bug 看上去是「抄漏了变量名」或「忘了改模板」，但只要有一个，模块就**完全不能正常工作**——所以写完之后一定要用万用表 / 示波器实际验证一下。

## 六、整体数据流

```
              ┌─────────────┐
   顺时针 ──► │  A 下降沿    │
   旋转    │  + B=0 时    │ ─► Encoder_Count--
              └─────────────┘
              ┌─────────────┐
   逆时针 ──► │  A 下降沿    │
   旋转    │  + B=1 时    │ ─► Encoder_Count++
              └─────────────┘
                       │
                       ▼
                ┌────────────┐
                │ 主循环读取  │
                │ OLED 显示  │
                └────────────┘
```

## 七、易错点清单

1. **EXTI_Line 与中断函数对不上**：EXTI0 的 IRQ 函数里 `if (EXTI_GetITStatus(EXTI_Line0))`，清 `EXTI_ClearITPendingBit(EXTI_Line0)`——其它几条 EXTI 同样规律。
2. **忘了清中断标志**：导致中断反复触发，CPU 被打断无法返回主循环，看起来像「死机」。
3. **共用 IRQ 函数里没分 `if`**：`EXTI9_5_IRQHandler` 里 `Line5` 和 `Line7` 都会进，必须各自分 `if (EXTI_GetITStatus(...))`。
4. **机械抖动没消**：机械触点会有 1~5 ms 抖动，转一格往往多算 2~4 次。**消抖**是必须的。
5. **PA0 / PB0 不能同时用 EXTI0**：EXTI 线是按 pin 编号共享的（PA0 / PB0 / ... / PG0 共用 Line0）。需要双 EXTI 就用 PA0 / PA1 这种组合。
6. **GPIO 没配上拉**：旋转编码器机械开关是开漏输出，没有外部上拉就读到浮空电平，要么常低要么常高，要么疯狂跳变。
7. **旋转方向反了**：把判断里 `== 0` 和 `== 1` 互换即可，**不用改硬件**。
8. **NVIC 优先级开太高**：旋转编码器中断频繁（每转一格触发 4 次），**别给它开抢占优先级 0**，否则会打断更重要的事。

## 八、小结

旋转编码器把「**EXTI0 / EXTI1 + 方向判定 + 消抖**」三件套串起来，是 EXTI 系列练习最好的综合题：

| 要点 | 怎么做 |
| --- | --- |
| 触发边沿 | 双边沿触发（`EXTI_Trigger_Rising_Falling`） |
| 方向判定 | A 触发时读 B；B 触发时读 A |
| 消抖 | 2 ms 内忽略二次中断，或硬件加 RC 滤波 |
| 清中断 | 进入中断处理完**必须** `ClearITPendingBit` |

到这一篇结束，「按键 / 中断 / 旋转编码器」这条线就串通了——下次拿到任何机械输入元件（限位开关、碰撞开关、震动传感器），套路都是：

> GPIO 上拉输入 → EXTI 边沿触发 → NVIC 中断服务 → 主循环读取 / 处理。

---

> **上一篇**：[03 EXTI 外部中断：原理 + 对射式红外计次](stm32-03-exti-wai-bu-zhong-duan)
