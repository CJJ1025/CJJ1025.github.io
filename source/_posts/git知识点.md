---
title: Git 常用命令与工作流
date: 2026-09-26 12:00:00
tags:
  - Git
  - 版本控制
categories:
  - 工具
---

本文记录 Git 的核心模型和日常最常用的命令，配合分支用法和「改坏了怎么救」的排查表，足够覆盖个人博客与日常开发。

## 一、四个区域：git 的全核心

理解 git 的关键，是搞清楚四个区域之间的关系：

{% mermaid %}
graph LR
	A["工作区<br/>你编辑的文件"] -->|git add| B["暂存区<br/>待提交清单"]
	B -->|git commit| C["本地仓库<br/>提交历史"]
	C -->|git push| D["远程仓库<br/>GitHub"]
	D -->|git pull| C
{% endmermaid %}

| 区域 | 是什么 | 由谁管理 |
| --- | --- | --- |
| **工作区** | 你实际编辑的文件 | 你的编辑器 |
| **暂存区** | 「这次要提交哪些改动」的清单 | `git add` |
| **本地仓库** | 一次次提交快照组成的历史，全在你电脑上 | `git commit` |
| **远程仓库** | GitHub 上的那份，部署平台从这里拉代码 | `git push` |

关键认知：**`commit` 只动本地、不需要联网**，所以本地随便提交多少次都没问题；只有 `push` 才会上传，才会触发部署平台重新构建。

## 二、为什么 add 和 commit 要分两步

暂存区（staging area）看着多此一举，但它带来两个实际好处：

1. **可以只提交一部分改动**。比如你同时改了两篇文章和一个配置，能只 `git add` 其中一篇单独提交，让每次提交记录只包含一件完整的事；
2. **提交前有一次确认机会**。`git add` 之后可以 `git diff --staged` 再扫一眼真正要提交的内容，避免把临时文件、调试代码混进去。

习惯了之后，你会发现「一次提交只做一件事」让历史记录非常好读，出问题时也容易定位。

## 三、最常用的四条命令

| 命令 | 作用 | 需要联网 |
| --- | --- | --- |
| `git status` | 查看当前有哪些改动 | 否 |
| `git add <文件>` | 把改动放进暂存区 | 否 |
| `git commit -m "说明"` | 生成一个本地快照 | 否 |
| `git push` | 推送到远程仓库 | 是 |

一次完整的提交流程：

```powershell
git status                     # 1. 看清改了什么
git diff                       # 2. 扫一眼具体改动内容
git add source/_posts/新文章.md   # 3. 放进暂存区（或 git add -A 全放进去）
git commit -m "新增文章：xxx"    # 4. 本地存档
git push                       # 5. 推到 GitHub
```

补充说明：

- `git add -A` 把所有改动一次性放进去，图省事时可以用，但更容易误提交；
- `git status` 是使用频率最高的命令，不确定当前状态时先敲它，不会有副作用；
- 提交信息写「做了什么」而不是「改了文件」，例如 `新增文章：蛇形方阵` 比 `更新` 有用得多。

## 四、查看历史与差异

```powershell
git log --oneline -10     # 最近 10 条提交，一行一条，最常用
git diff                  # 还没 add 的改动具体是什么
git diff --staged         # 已经 add、即将提交的内容
git show 提交号            # 看某次提交改了什么
```

**提交前先 `git diff` 扫一眼**是个值得养成的习惯——它能帮你发现「这个临时文件本来不该提交」「这行调试输出忘了删」这类问题。

## 五、改坏了怎么救

先按「改动走到哪一步了」定位：

{% mermaid %}
graph TD
	A["改动出了问题"] --> B{"已经 add 了吗？"}
	B -->|没有| C["git restore 文件名<br/>直接还原"]
	B -->|已经 add| D["git restore --staged 文件名<br/>撤出暂存区，改动保留"]
	D --> E{"已经 commit 了吗？"}
	B -->|已经 commit| E
	E -->|没有 push| F["git reset --soft HEAD~1"]
	E -->|已经 push| G["改文件，再 commit + push 一次"]
{% endmermaid %}

| 情况 | 命令 | 效果 |
| --- | --- | --- |
| 改了文件想还原（还没 add） | `git restore 文件名` | 丢弃改动，回到上次提交的状态 |
| 已 add 想撤出暂存区 | `git restore --staged 文件名` | 退出暂存区，**改动仍然保留** |
| 刚提交想撤销，但保留改动 | `git reset --soft HEAD~1` | 撤销最近一次提交，改动回到暂存区 |
| 提交信息写错（还没 push） | `git commit --amend -m "新说明"` | 替换最近一次提交的信息 |
| 已经 push 才发现写错 | 改文件 → 再 commit + push | 多一条「修正」提交 |

两点必须注意：

- **`HEAD~1` 的含义**：`HEAD` 指向最新提交，`~1` 表示往前数一个，所以 `HEAD~1` 就是「上一次提交」。想撤销更多次就写 `HEAD~2`、`HEAD~3`。
- **已经 push 出去的历史不要试图改写**。`git reset` 后再强行 `push --force` 会破坏远端历史，如果多人协作更是灾难。多提交一条「修正」完全正常，比强行回退安全得多。
- ⚠️ **慎用 `git reset --hard`**：它会**直接丢弃**改动，无法恢复。想保留改动就用 `--soft`（改动进暂存区）或 `--mixed`（改动留在工作区，这是默认行为）。

## 六、分支

分支的意义是**试验新东西时不污染主线**：

{% mermaid %}
graph LR
	A["初始提交"] --> B["提交 A"]
	B --> C["提交 B"]
	B -->|git switch -c 试验| D["试验分支"]
	D --> E["随便折腾"]
	C --> F["main 主线<br/>照常运行"]
{% endmermaid %}

```powershell
git branch                     # 查看所有分支（* 标记当前分支）
git switch -c try-new-theme    # 新建并切换到试验分支，随便折腾
git switch main                # 切回主线，网站照旧
git branch -d try-new-theme    # 删除已经合并的分支
```

**对个人博客来说，暂时不需要分支**。直接在主分支上写文章、提交、推送就是最简单可靠的流程。等你想大改主题、又怕搞坏现有网站时，再开一个分支折腾，满意了合并回主线。这也是分支最典型的使用场景。

## 七、套到博客上的完整流程

```powershell
# 1. 本地写文章，反复修改（全程不碰 git）
npx hexo server

# 2. 写完、预览满意后
git status                                    # 确认改了哪些文件
git add source/_posts/新文章.md
git commit -m "新增文章：xxx"
git push                                      # 部署平台自动构建上线
```

## 八、几个常见疑问

**Q：那行黄色的 `LF will be replaced by CRLF` 警告是什么？**

不是错误，是 Windows 上的正常提示。Windows 文本文件用 CRLF（`\r\n`）换行，git 会在存储时统一转成 LF（`\n`）、检出时再转回 CRLF。所有 Windows 用户都会看到，忽略即可。

**Q：每改一点就要 push 吗？会不会对仓库不好？**

不用，也完全不会有坏影响。git 天生为高频提交设计（Linux 内核项目每天上万个提交）。把两件事分开理解：

- **`commit`** 纯本地、秒完成，攒多少个都无所谓；
- **`push`** 才会触发部署平台重建，攒几个提交一起推更省心——平台只会构建最后一次。

**Q：写到一半不想让它上线怎么办？**

两个办法：把文件放进 `source/_drafts/` 目录（草稿），或在文章 front-matter 里加 `published: false`，构建时会跳过。

**Q：能从远程拉取更新到本地吗？**

可以，`git pull` 相当于「拉取远程改动 + 合并到当前分支」。单人单机写作基本用不到；如果你在多台电脑上写博客，换电脑开工前先 `git pull` 就对了。

## 九、小结

- git 的核心是**四个区域**：工作区 →（add）→ 暂存区 →（commit）→ 本地仓库 →（push）→ 远程仓库；
- `commit` 不需要联网，`push` 才上传并触发部署；
- 日常四条命令：`git status` / `git add` / `git commit` / `git push`；
- 提交前用 `git diff` 扫一眼，能挡掉大部分误提交；
- 撤销要**按阶段选命令**：没 add 用 `restore`，已 add 用 `restore --staged`，已 commit 用 `reset --soft`；**已 push 的就再提交一次修正**；
- `git reset --hard` 会直接丢改动，慎用；
- 分支用于隔离试验，个人博客暂时可以不碰。

想系统学的话，推荐官方免费的 [Pro Git 中文版](https://git-scm.com/book/zh/v2)：第二章讲基础，第三章讲分支，读完足够日常使用。
