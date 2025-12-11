// boardgame-data.js
// 月之森桌游 · 资料数据
// 以后你只要改这个文件，就可以新增/调整卡包和卡牌，而不用动 HTML。

// 一个全局对象，两个部分：packs（卡包列表）+ cards（每个卡包里的卡牌列表）
const CARD_GAME = {
  packs: [
{
  id: "royal",
  name: "保皇党",
  subtitle: "本篇·基础卡组",
  side: "保皇党",
  era: "主世界",
  status: "released",
  description: "在这里写一句对「保皇党」的介绍。",
  note: ""
},
{
  id: "revote",
  name: "起义军",
  subtitle: "本篇·基础卡组",
  side: "起义军",
  era: "主世界",
  status: "released",
  description: "在这里写一句对「起义军」的介绍。",
  note: ""
},
{
  id: "faith",
  name: "新教徒",
  subtitle: "DLC1·本篇",
  side: "新教徒",
  era: "主世界·迭代",
  status: "released",
  description: "在这里写一句对「新教徒」的介绍。",
  note: ""
},
    {
      id: "forest-spirits-dlc1",
      name: "森妖怪",
      subtitle: "DLC1 · 世界",
      side: "中立 / 森域",
      era: "主世界 · 扩展",
      status: "wip",
      description:
        "以场地与环境为轴心的卡包，让森林本身成为棋盘的一部分。",
      note: ""
    },
    // 这个就是你说的“空的虚边缘卡包”
    {
      id: "placeholder-next-pack",
      name: "下一套卡包……？",
      subtitle: "尚未命名",
      side: "未公开",
      era: "待定",
      status: "placeholder", // 特殊状态：只是一个虚边缘位
      description:
        "新的故事、新的阵营，可能已经在笔记本的某一页出现，也可能还在黄瓜架上慢慢结果。",
      note: ""
    }
  ],
};

window.CARD_GAME = CARD_GAME;
