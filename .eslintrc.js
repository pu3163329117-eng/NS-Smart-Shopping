module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // 反重力规范：No Shit Code
    'max-lines': ['error', { 
      max: 300,
      skipBlankLines: true,
      skipComments: true 
    }],
    'max-lines-per-function': ['error', {
      max: 50,
      skipBlankLines: true,
      skipComments: true
    }],
    'complexity': ['error', 10],
    
    // 代码质量
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    
    // Vue规范
    'vue/multi-word-component-names': 'off',
    'vue/no-unused-components': 'error',
    'vue/no-unused-vars': 'error',
    'vue/require-default-prop': 'error',
    'vue/require-explicit-emits': 'error',
    
    // 格式规范
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never']
  },
  overrides: [
    {
      files: ['*.vue'],
      rules: {
        'max-lines': ['error', { 
          max: 400, // Vue文件允许稍多行数
          skipBlankLines: true,
          skipComments: true 
        }]
      }
    },
    {
      files: ['server/**/*.js'],
      env: {
        node: true
      },
      rules: {
        'no-console': 'off' // 服务器端允许console
      }
    }
  ]
};