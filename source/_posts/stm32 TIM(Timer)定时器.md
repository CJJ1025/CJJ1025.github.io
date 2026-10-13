---
title: STM32 TIM 定时器：让 CPU 解放双手
date: 2026-10-12 23:50:00
tags:
  - STM32
  - 嵌入式
  - 定时器
  - HAL
categories:
  - STM32学习
---

定时器（TIM）是 STM32 里最常用、最强大的外设之一。它能对输入的时钟进行**计数**，并在数值达到设定值时触发中断——本质就是一个**硬件计数器**。

> 这一篇只整理**通用定时器**最常用的部分：基本定时、PWM 输出（如果你想补全这一节，可以写在下面留白处）。

---

## 一、定时器能干什么

| 用途 | 说明 |
| --- | --- |
| **定时中断** | 每隔固定时间进一次中断，做周期性任务（LED 闪烁、按键扫描） |
| **输出比较 / PWM** | 输出可变占空比的方波，驱动电机、舵机、LED 调光 |
| **输入捕获** | 测量外部信号的频率 / 占空比 / 脉宽 |
| **编码器接口** | 读取旋转编码器的旋转方向与速度 |

---

## 二、几个核心概念

### 2.1 时钟源

定时器由**内部时钟（CK_INT）** 或**外部信号**驱动。对应的预分频器把时钟频率降到"想要的计数频率"。

### 2.2 三个关键寄存器（概念）

| 寄存器 / 参数 | 作用 |
| --- | --- |
| **PSC（预分频器 Prescaler）** | 把输入时钟先除一下：`CK_CNT = CK_PSC / (PSC + 1)` |
| **CNT（计数器 Counter）** | 当前计数值，从 0 累加到 ARR 就触发事件 |
| **ARR（自动重装载值 Auto-Reload Register）** | 计数器计数到 ARR 时归零（向上计数），重新开始下一轮 |

> 计时公式：**定时时间 = (PSC + 1) × (ARR + 1) / 定时器时钟频率**

### 2.3 计数模式

| 模式 | 行为 |
| --- | --- |
| 向上计数 | CNT 从 0 累加到 ARR，溢出归零 |
| 向下计数 | CNT 从 ARR 减到 0，溢出归 ARR |
| 中央对齐 | 先向上、再向下，常用于电机控制 |

---

## 三、HAL 库配置步骤（STM32CubeMX）

1. **打开时钟**：在 `RCC` 里开启对应定时器时钟；
2. **选定时器**：左侧选 `TIMx`（如 `TIM2`）；
3. **Clock Source**：`Internal Clock`；
4. **Parameter Settings**：
   - `Prescaler (PSC)`：预分频值；
   - `Counter Period (ARR)`：自动重装载值；
   - `Counter Mode`：Up 计数；
   - `auto-reload preload`：使能；
5. **NVIC Settings**：勾选定时器更新中断，配置优先级；
6. **生成代码**，在 `stm32f1xx_it.c` 或自定义文件里写中断回调。

---

## 四、计算示例

假设系统时钟 72 MHz，希望**每 1 ms 进一次中断**：

$$\text{定时时间} = \frac{(\text{PSC}+1) \times (\text{ARR}+1)}{f_{\text{CK}}}$$

设 PSC = 71，ARR = 999：

$$\frac{72}{72+1} \times (999 + 1) = 1 \text{ ms}$$

- **PSC = 71**：72 MHz / 72 = 1 MHz；
- **ARR = 999**：1 MHz / 1000 = 1 kHz = 1 ms 中断一次。

---

## 五、HAL 库关键 API

```cpp
// 启动定时器中断
HAL_TIM_Base_Start_IT(&htim2);

// 关闭定时器中断
HAL_TIM_Base_Stop_IT(&htim2);

// 获取当前计数值
uint16_t cnt = __HAL_TIM_GET_COUNTER(&htim2);

// 重新设置 ARR
__HAL_TIM_SET_AUTORELOAD(&htim2, new_arr);
```

### 5.1 中断回调函数

在 `stm32f1xx_it.c` 里，硬件进中断后会调用 `HAL_TIM_IRQHandler(&htim2)`，最终调用我们写的回调：

```cpp
// tim.c 或自定义文件
uint16_t cnt = 0;

void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim) {
    if (htim->Instance == TIM2) {           // 确认是 TIM2 触发的
        cnt++;
        if (cnt >= 500) {                   // 500 ms
            cnt = 0;
            HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);   // 翻转 LED
        }
    }
}
```

> `HAL_TIM_PeriodElapsedCallback` 是**所有定时器共享**的回调，必须**自己用 `htim->Instance` 判断是哪一路定时器**触发的。

---

## 六、定时器中断 vs `HAL_Delay`

| 方式 | 优点 | 缺点 |
| --- | --- | --- |
| `HAL_Delay(ms)` | 一行代码搞定 | **阻塞 CPU**，期间 MCU 不能做其他事 |
| 定时器中断 | 不阻塞，CPU 解放 | 略复杂，要配 CubeMX + 写回调 |

> **经验**：能用定时器中断就别用 `HAL_Delay`。`HAL_Delay` 本质是 SysTick 中断里累加，只能用在"等一下"这种简单等待。

---

## 七、易错点清单

1. **PSC / ARR 算错**：算完一定要带具体数字验算一遍。
2. **多个定时器共用回调忘了判断**：所有 `HAL_TIM_PeriodElapsedCallback` 都会进同一个函数，**必须用 `htim->Instance` 判断**。
3. **`HAL_TIM_Base_Start` vs `HAL_TIM_Base_Start_IT`**：前者只启动计数器、不开中断；后者才开启更新中断。**需要中断必须用 `_IT` 后缀**。
4. **中断优先级没开**：在 CubeMX 里勾了 `NVIC` 但忘了给抢占优先级实际值，或者 `HAL_NVIC_EnableIRQ` 没调——结果"配置了但不进中断"。
5. **arr 改成 0 等于没开**：更新事件触发条件是"计数到 ARR"，ARR = 0 时计数一次就溢出，几乎是最高频率。

---

## 八、小结

- TIM 定时器 = **硬件计数器**，到点自动进中断；
- 公式：**`定时时间 = (PSC+1) × (ARR+1) / f_ck`**；
- HAL 库：CubeMX 配好 → `HAL_TIM_Base_Start_IT` → 写 `HAL_TIM_PeriodElapsedCallback`；
- 多定时器共用回调，**必须用 `htim->Instance` 区分**；
- 能用中断就别 `HAL_Delay`，让 CPU 解放出来。

---

> （这一篇的"PWM 输出 / 输入捕获 / 编码器接口"等部分留作后续补充。先按上面"基本定时"起步，足够应付绝大多数入门场景。）
