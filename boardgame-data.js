// boardgame-data.js
// 月之森桌游 · 资料数据
// 以后你只要改这个文件，就可以新增/调整卡包和卡牌，而不用动 HTML。

// 一个全局对象，两个部分：packs（卡包列表）+ cards（每个卡包里的卡牌列表）
const CARD_GAME = {
  packs: [
    {
      id: "royalist-lv1",
      name: "保皇党 Lv1",
      subtitle: "本篇 · 基础卡组",
      side: "保皇党",
      era: "主世界 · 一代",
      status: "released", // released / wip / planned
      description:
        "以稳扎稳打的防御与资源运作为核心的基础卡组，是整个体系的起点。",
      note: ""
    },
    {
      id: "rebel-lv1",
      name: "起义军 Lv1",
      subtitle: "本篇 · 对立阵营",
      side: "起义军",
      era: "主世界 · 一代",
      status: "released",
      description:
        "以节奏爆发和局部优势为主的对立卡组，用更激进的方式打破僵局。",
      note: ""
    },
    {
      id: "new-faith-dlc1",
      name: "新教徒",
      subtitle: "DLC1 · 世界",
      side: "中立 / 变革",
      era: "主世界 · 扩展",
      status: "wip",
      description:
        "通过仪式与转换，改写局面结构的扩展包。这里将来可以补充更多世界观说明。",
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

  // cards 里按“卡包 id”分组
  // 暂时做一个示例结构，你可以照着往里填 Excel 里的实际卡牌
  cards: {
    "royalist-lv1": [
      {
        code: "RL1-01",
        name: "示例：宫廷侍从",
        type: "单位",
        cost: "2",
        role: "保皇党",
        tags: ["基础", "支援"],
        text: "【示例效果】当你部署此单位时，可以为一个友方单位提供小幅防御加成。",
        note: "这里只是示例卡，真正数据请以后替换为 Excel 中的实际单卡。"
      },
      {
        code: "RL1-02",
        name: "示例：王室诏令",
        type: "事件",
        cost: "1",
        role: "保皇党",
        tags: ["指令"],
        text: "【示例效果】本回合内，你的下一个单位费用减少 1。",
        note: ""
      }
    ],

    "rebel-lv1": [
      {
        code: "RB1-01",
        name: "示例：街巷煽动者",
        type: "单位",
        cost: "1",
        role: "起义军",
        tags: ["速攻"],
        text: "【示例效果】登场时对对方造成少量扰乱效果。",
        note: ""
      }
    ],

    // 其他卡包暂时为空数组，等你有心情慢慢补
    "new-faith-dlc1": [],
    "forest-spirits-dlc1": [],
    "placeholder-next-pack": []
  }
};

window.CARD_GAME = CARD_GAME;
