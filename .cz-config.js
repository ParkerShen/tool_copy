module.exports = {
  types: [
    { value: 'feat', name: '特性:     新增功能' },
    { value: 'fix', name: '修复:     修复bug' },
    { value: 'docs', name: '文档:     文档变更' },
    { value: 'style', name: '格式:     代码格式（空格、分号等）' },
    { value: 'refactor', name: '重构:     代码重构，非功能变更' },
    { value: 'perf', name: '性能:     性能优化' },
    { value: 'test', name: '测试:     添加或修改测试' },
    { value: 'chore', name: '工具:     构建过程或辅助工具变更' },
    { value: 'revert', name: '回滚:     回退提交' },
    { value: 'build', name: '构建:     构建系统变更' },
    { value: 'ci', name: 'CI:       CI配置变更' }
  ],

  messages: {
    type: '选择提交类型:',
    scope: '\n选择影响范围 (可选):',
    customScope: '输入自定义范围:',
    subject: '填写简短描述 (必填):',
    body: '填写详细描述 (可选，使用"\\n"换行):',
    breaking: '列出不兼容变更 (可选):',
    footer: '列出关闭的issue (可选):',
    confirmCommit: '确认提交?'
  },

  allowCustomScopes: true,
  allowBreakingChanges: ['feat', 'fix'],
  skipQuestions: ['footer', 'body', 'breaking'], // 跳过不需要的问题
  subjectLimit: 100
};
