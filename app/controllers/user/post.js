const {
  User,
  Usercontactinfo,
  BlackToken
} = require('../../models');

const bcrypt = require('bcrypt');

function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

const {
  generateToken
} = require('../../../util/jwtUtils');

// 登录接口
const login = async (req, res) => {

  try {


    // 处理登录逻辑，验证用户名和密码等
    const {
      username,
      password
    } = req.body

    const user = await User.findOne({
      where: {
        username,
        deleted: 0
      },
      raw: true
    });
    

    // const saltRounds = 10; // 盐的轮数，用于增加哈希复杂度
    // // 密码加密方式  ,注册有用到
    // const hashedPassword = bcrypt.hashSync('123456a123', saltRounds);
    // console.log('hashedPassword', hashedPassword)

    // 判断用户是否存在
    if (user) {
      //判断密码是否准确
      if (bcrypt.compareSync(password + user.salt, user.password)) {
        // console.log('密码验证通过');
        // 登录成功，生成 token
        const token = await generateToken(username);
        // 将 token 返回给客户端
        res.status(200).json({
          code: 1,
          // token: token,
          data: {
            accessToken: token,
            refreshToken: token,
            user:{
              "id": "2fd31223-5fb7-4a2b-82e7-68ad8c6de1a2",
              "username": "admin@gmail.com",
              "email": "Garett33@yahoo.com",
              "avatar": "https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/1043.jpg",
              "createdAt": "2023-09-29T12:23:24.664Z",
              "updatedAt": "2024-03-25T06:54:44.806Z",
              "password": "demo1234",
              "role": {
                "id": "4281707933534332",
                "name": "Admin",
                "label": "admin",
                "status": 1,
                "order": 1,
                "desc": "Super Admin",
                "permission": [
                  {
                    "id": "9100714781927703",
                    "parentId": "",
                    "label": "sys.menu.dashboard",
                    "name": "Dashboard",
                    "icon": "ic-analysis",
                    "type": 0,
                    "route": "dashboard",
                    "order": 1,
                    "children": [
                      {
                        "id": "8426999229400979",
                        "parentId": "9100714781927703",
                        "label": "sys.menu.workbench",
                        "name": "Workbench",
                        "type": 1,
                        "route": "workbench",
                        "component": "/dashboard/workbench/index.tsx"
                      },
                      {
                        "id": "9710971640510357",
                        "parentId": "9100714781927703",
                        "label": "sys.menu.analysis",
                        "name": "Analysis",
                        "type": 1,
                        "route": "analysis",
                        "component": "/dashboard/analysis/index.tsx"
                      }
                    ]
                  },
                  {
                    "id": "0901673425580518",
                    "parentId": "",
                    "label": "sys.menu.management",
                    "name": "Management",
                    "icon": "ic-management",
                    "type": 0,
                    "route": "management",
                    "order": 2,
                    "children": [
                      {
                        "id": "2781684678535711",
                        "parentId": "0901673425580518",
                        "label": "sys.menu.user.index",
                        "name": "User",
                        "type": 0,
                        "route": "user",
                        "children": [
                          {
                            "id": "4754063958766648",
                            "parentId": "2781684678535711",
                            "label": "sys.menu.user.profile",
                            "name": "Profile",
                            "type": 1,
                            "route": "profile",
                            "component": "/management/user/profile/index.tsx"
                          },
                          {
                            "id": "2516598794787938",
                            "parentId": "2781684678535711",
                            "label": "sys.menu.user.account",
                            "name": "Account",
                            "type": 1,
                            "route": "account",
                            "component": "/management/user/account/index.tsx"
                          }
                        ]
                      },
                      {
                        "id": "0249937641030250",
                        "parentId": "0901673425580518",
                        "label": "sys.menu.system.index",
                        "name": "System",
                        "type": 0,
                        "route": "system",
                        "children": [
                          {
                            "id": "1985890042972842",
                            "parentId": "0249937641030250",
                            "label": "sys.menu.system.organization",
                            "name": "Organization",
                            "type": 1,
                            "route": "organization",
                            "component": "/management/system/organization/index.tsx"
                          },
                          {
                            "id": "4359580910369984",
                            "parentId": "0249937641030250",
                            "label": "sys.menu.system.permission",
                            "name": "Permission",
                            "type": 1,
                            "route": "permission",
                            "component": "/management/system/permission/index.tsx"
                          },
                          {
                            "id": "1689241785490759",
                            "parentId": "0249937641030250",
                            "label": "sys.menu.system.role",
                            "name": "Role",
                            "type": 1,
                            "route": "role",
                            "component": "/management/system/role/index.tsx"
                          },
                          {
                            "id": "0157880245365433",
                            "parentId": "0249937641030250",
                            "label": "sys.menu.system.user",
                            "name": "User",
                            "type": 1,
                            "route": "user",
                            "component": "/management/system/user/index.tsx"
                          },
                          {
                            "id": "0157880245365434",
                            "parentId": "0249937641030250",
                            "label": "sys.menu.system.user_detail",
                            "name": "User Detail",
                            "type": 1,
                            "route": "user/:id",
                            "component": "/management/system/user/detail.tsx",
                            "hide": true
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "id": "2271615060673773",
                    "parentId": "",
                    "label": "sys.menu.components",
                    "name": "Components",
                    "icon": "solar:widget-5-bold-duotone",
                    "type": 0,
                    "route": "components",
                    "order": 3,
                    "children": [
                      {
                        "id": "2478488238255411",
                        "parentId": "2271615060673773",
                        "label": "sys.menu.icon",
                        "name": "Icon",
                        "type": 1,
                        "route": "icon",
                        "component": "/components/icon/index.tsx"
                      },
                      {
                        "id": "6755238352318767",
                        "parentId": "2271615060673773",
                        "label": "sys.menu.animate",
                        "name": "Animate",
                        "type": 1,
                        "route": "animate",
                        "component": "/components/animate/index.tsx"
                      },
                      {
                        "id": "9992476513546805",
                        "parentId": "2271615060673773",
                        "label": "sys.menu.scroll",
                        "name": "Scroll",
                        "type": 1,
                        "route": "scroll",
                        "component": "/components/scroll/index.tsx"
                      },
                      {
                        "id": "1755562695856395",
                        "parentId": "2271615060673773",
                        "label": "sys.menu.markdown",
                        "name": "Markdown",
                        "type": 1,
                        "route": "markdown",
                        "component": "/components/markdown/index.tsx"
                      },
                      {
                        "id": "2122547769468069",
                        "parentId": "2271615060673773",
                        "label": "sys.menu.editor",
                        "name": "Editor",
                        "type": 1,
                        "route": "editor",
                        "component": "/components/editor/index.tsx"
                      },
                      {
                        "id": "2501920741714350",
                        "parentId": "2271615060673773",
                        "label": "sys.menu.i18n",
                        "name": "Multi Language",
                        "type": 1,
                        "route": "i18n",
                        "component": "/components/multi-language/index.tsx"
                      },
                      {
                        "id": "2013577074467956",
                        "parentId": "2271615060673773",
                        "label": "sys.menu.upload",
                        "name": "upload",
                        "type": 1,
                        "route": "Upload",
                        "component": "/components/upload/index.tsx"
                      },
                      {
                        "id": "7749726274771764",
                        "parentId": "2271615060673773",
                        "label": "sys.menu.chart",
                        "name": "Chart",
                        "type": 1,
                        "route": "chart",
                        "component": "/components/chart/index.tsx"
                      }
                    ]
                  },
                  {
                    "id": "8132044808088488",
                    "parentId": "",
                    "label": "sys.menu.functions",
                    "name": "functions",
                    "icon": "solar:plain-2-bold-duotone",
                    "type": 0,
                    "route": "functions",
                    "order": 4,
                    "children": [
                      {
                        "id": "3667930780705750",
                        "parentId": "8132044808088488",
                        "label": "sys.menu.clipboard",
                        "name": "Clipboard",
                        "type": 1,
                        "route": "clipboard",
                        "component": "/functions/clipboard/index.tsx"
                      }
                    ]
                  },
                  {
                    "id": "0194818428516575",
                    "parentId": "",
                    "label": "sys.menu.menulevel.index",
                    "name": "Menu Level",
                    "icon": "ic-menulevel",
                    "type": 0,
                    "route": "menu-level",
                    "order": 5,
                    "children": [
                      {
                        "id": "0144431332471389",
                        "parentId": "0194818428516575",
                        "label": "sys.menu.menulevel.1a",
                        "name": "Menu Level 1a",
                        "type": 1,
                        "route": "menu-level-1a",
                        "component": "/menu-level/menu-level-1a/index.tsx"
                      },
                      {
                        "id": "7572529636800586",
                        "parentId": "0194818428516575",
                        "label": "sys.menu.menulevel.1b.index",
                        "name": "Menu Level 1b",
                        "type": 0,
                        "route": "menu-level-1b",
                        "children": [
                          {
                            "id": "3653745576583237",
                            "parentId": "7572529636800586",
                            "label": "sys.menu.menulevel.1b.2a",
                            "name": "Menu Level 2a",
                            "type": 1,
                            "route": "menu-level-2a",
                            "component": "/menu-level/menu-level-1b/menu-level-2a/index.tsx"
                          },
                          {
                            "id": "4873136353891364",
                            "parentId": "7572529636800586",
                            "label": "sys.menu.menulevel.1b.2b.index",
                            "name": "Menu Level 2b",
                            "type": 0,
                            "route": "menu-level-2b",
                            "children": [
                              {
                                "id": "4233029726998055",
                                "parentId": "4873136353891364",
                                "label": "sys.menu.menulevel.1b.2b.3a",
                                "name": "Menu Level 3a",
                                "type": 1,
                                "route": "menu-level-3a",
                                "component": "/menu-level/menu-level-1b/menu-level-2b/menu-level-3a/index.tsx"
                              },
                              {
                                "id": "3298034742548454",
                                "parentId": "4873136353891364",
                                "label": "sys.menu.menulevel.1b.2b.3b",
                                "name": "Menu Level 3b",
                                "type": 1,
                                "route": "menu-level-3b",
                                "component": "/menu-level/menu-level-1b/menu-level-2b/menu-level-3b/index.tsx"
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "id": "9406067785553476",
                    "parentId": "",
                    "label": "sys.menu.error.index",
                    "name": "Error",
                    "icon": "bxs:error-alt",
                    "type": 0,
                    "route": "error",
                    "order": 6,
                    "children": [
                      {
                        "id": "8557056851997154",
                        "parentId": "9406067785553476",
                        "label": "sys.menu.error.403",
                        "name": "403",
                        "type": 1,
                        "route": "403",
                        "component": "/sys/error/Page403.tsx"
                      },
                      {
                        "id": "5095669208159005",
                        "parentId": "9406067785553476",
                        "label": "sys.menu.error.404",
                        "name": "404",
                        "type": 1,
                        "route": "404",
                        "component": "/sys/error/Page404.tsx"
                      },
                      {
                        "id": "0225992135973772",
                        "parentId": "9406067785553476",
                        "label": "sys.menu.error.500",
                        "name": "500",
                        "type": 1,
                        "route": "500",
                        "component": "/sys/error/Page500.tsx"
                      }
                    ]
                  },
                  {
                    "id": "3981225257359246",
                    "parentId": "",
                    "label": "sys.menu.calendar",
                    "name": "Calendar",
                    "icon": "solar:calendar-bold-duotone",
                    "type": 1,
                    "route": "calendar",
                    "component": "/sys/others/calendar/index.tsx"
                  },
                  {
                    "id": "3513985683886393",
                    "parentId": "",
                    "label": "sys.menu.kanban",
                    "name": "kanban",
                    "icon": "solar:clipboard-bold-duotone",
                    "type": 1,
                    "route": "kanban",
                    "component": "/sys/others/kanban/index.tsx"
                  },
                  {
                    "id": "5455837930804461",
                    "parentId": "",
                    "label": "sys.menu.disabled",
                    "name": "Disabled",
                    "icon": "ic_disabled",
                    "type": 1,
                    "route": "disabled",
                    "status": 0,
                    "component": "/sys/others/calendar/index.tsx"
                  },
                  {
                    "id": "7728048658221587",
                    "parentId": "",
                    "label": "sys.menu.label",
                    "name": "Label",
                    "icon": "ic_label",
                    "type": 1,
                    "route": "label",
                    "newFeature": true,
                    "component": "/sys/others/blank.tsx"
                  },
                  {
                    "id": "5733704222120995",
                    "parentId": "",
                    "label": "sys.menu.frame",
                    "name": "Frame",
                    "icon": "ic_external",
                    "type": 0,
                    "route": "frame",
                    "children": [
                      {
                        "id": "9884486809510480",
                        "parentId": "5733704222120995",
                        "label": "sys.menu.external_link",
                        "name": "External Link",
                        "type": 1,
                        "route": "external_link",
                        "hideTab": true,
                        "component": "/sys/others/iframe/external-link.tsx",
                        "frameSrc": "https://ant.design/"
                      },
                      {
                        "id": "9299640886731819",
                        "parentId": "5733704222120995",
                        "label": "sys.menu.iframe",
                        "name": "Iframe",
                        "type": 1,
                        "route": "frame",
                        "component": "/sys/others/iframe/index.tsx",
                        "frameSrc": "https://ant.design/"
                      }
                    ]
                  },
                  {
                    "id": "0941594969900756",
                    "parentId": "",
                    "label": "sys.menu.blank",
                    "name": "Disabled",
                    "icon": "ic_blank",
                    "type": 1,
                    "route": "blank",
                    "component": "/sys/others/blank.tsx"
                  }
                ]
              },
              "permissions": [
                {
                  "id": "9100714781927703",
                  "parentId": "",
                  "label": "sys.menu.dashboard",
                  "name": "Dashboard",
                  "icon": "ic-analysis",
                  "type": 0,
                  "route": "dashboard",
                  "order": 1,
                  "children": [
                    {
                      "id": "8426999229400979",
                      "parentId": "9100714781927703",
                      "label": "sys.menu.workbench",
                      "name": "Workbench",
                      "type": 1,
                      "route": "workbench",
                      "component": "/dashboard/workbench/index.tsx"
                    },
                    {
                      "id": "9710971640510357",
                      "parentId": "9100714781927703",
                      "label": "sys.menu.analysis",
                      "name": "Analysis",
                      "type": 1,
                      "route": "analysis",
                      "component": "/dashboard/analysis/index.tsx"
                    }
                  ]
                },
                {
                  "id": "0901673425580518",
                  "parentId": "",
                  "label": "sys.menu.management",
                  "name": "Management",
                  "icon": "ic-management",
                  "type": 0,
                  "route": "management",
                  "order": 2,
                  "children": [
                    {
                      "id": "2781684678535711",
                      "parentId": "0901673425580518",
                      "label": "sys.menu.user.index",
                      "name": "User",
                      "type": 0,
                      "route": "user",
                      "children": [
                        {
                          "id": "4754063958766648",
                          "parentId": "2781684678535711",
                          "label": "sys.menu.user.profile",
                          "name": "Profile",
                          "type": 1,
                          "route": "profile",
                          "component": "/management/user/profile/index.tsx"
                        },
                        {
                          "id": "2516598794787938",
                          "parentId": "2781684678535711",
                          "label": "sys.menu.user.account",
                          "name": "Account",
                          "type": 1,
                          "route": "account",
                          "component": "/management/user/account/index.tsx"
                        }
                      ]
                    },
                    {
                      "id": "0249937641030250",
                      "parentId": "0901673425580518",
                      "label": "sys.menu.system.index",
                      "name": "System",
                      "type": 0,
                      "route": "system",
                      "children": [
                        {
                          "id": "1985890042972842",
                          "parentId": "0249937641030250",
                          "label": "sys.menu.system.organization",
                          "name": "Organization",
                          "type": 1,
                          "route": "organization",
                          "component": "/management/system/organization/index.tsx"
                        },
                        {
                          "id": "4359580910369984",
                          "parentId": "0249937641030250",
                          "label": "sys.menu.system.permission",
                          "name": "Permission",
                          "type": 1,
                          "route": "permission",
                          "component": "/management/system/permission/index.tsx"
                        },
                        {
                          "id": "1689241785490759",
                          "parentId": "0249937641030250",
                          "label": "sys.menu.system.role",
                          "name": "Role",
                          "type": 1,
                          "route": "role",
                          "component": "/management/system/role/index.tsx"
                        },
                        {
                          "id": "0157880245365433",
                          "parentId": "0249937641030250",
                          "label": "sys.menu.system.user",
                          "name": "User",
                          "type": 1,
                          "route": "user",
                          "component": "/management/system/user/index.tsx"
                        },
                        {
                          "id": "0157880245365434",
                          "parentId": "0249937641030250",
                          "label": "sys.menu.system.user_detail",
                          "name": "User Detail",
                          "type": 1,
                          "route": "user/:id",
                          "component": "/management/system/user/detail.tsx",
                          "hide": true
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "2271615060673773",
                  "parentId": "",
                  "label": "sys.menu.components",
                  "name": "Components",
                  "icon": "solar:widget-5-bold-duotone",
                  "type": 0,
                  "route": "components",
                  "order": 3,
                  "children": [
                    {
                      "id": "2478488238255411",
                      "parentId": "2271615060673773",
                      "label": "sys.menu.icon",
                      "name": "Icon",
                      "type": 1,
                      "route": "icon",
                      "component": "/components/icon/index.tsx"
                    },
                    {
                      "id": "6755238352318767",
                      "parentId": "2271615060673773",
                      "label": "sys.menu.animate",
                      "name": "Animate",
                      "type": 1,
                      "route": "animate",
                      "component": "/components/animate/index.tsx"
                    },
                    {
                      "id": "9992476513546805",
                      "parentId": "2271615060673773",
                      "label": "sys.menu.scroll",
                      "name": "Scroll",
                      "type": 1,
                      "route": "scroll",
                      "component": "/components/scroll/index.tsx"
                    },
                    {
                      "id": "1755562695856395",
                      "parentId": "2271615060673773",
                      "label": "sys.menu.markdown",
                      "name": "Markdown",
                      "type": 1,
                      "route": "markdown",
                      "component": "/components/markdown/index.tsx"
                    },
                    {
                      "id": "2122547769468069",
                      "parentId": "2271615060673773",
                      "label": "sys.menu.editor",
                      "name": "Editor",
                      "type": 1,
                      "route": "editor",
                      "component": "/components/editor/index.tsx"
                    },
                    {
                      "id": "2501920741714350",
                      "parentId": "2271615060673773",
                      "label": "sys.menu.i18n",
                      "name": "Multi Language",
                      "type": 1,
                      "route": "i18n",
                      "component": "/components/multi-language/index.tsx"
                    },
                    {
                      "id": "2013577074467956",
                      "parentId": "2271615060673773",
                      "label": "sys.menu.upload",
                      "name": "upload",
                      "type": 1,
                      "route": "Upload",
                      "component": "/components/upload/index.tsx"
                    },
                    {
                      "id": "7749726274771764",
                      "parentId": "2271615060673773",
                      "label": "sys.menu.chart",
                      "name": "Chart",
                      "type": 1,
                      "route": "chart",
                      "component": "/components/chart/index.tsx"
                    }
                  ]
                },
                {
                  "id": "8132044808088488",
                  "parentId": "",
                  "label": "sys.menu.functions",
                  "name": "functions",
                  "icon": "solar:plain-2-bold-duotone",
                  "type": 0,
                  "route": "functions",
                  "order": 4,
                  "children": [
                    {
                      "id": "3667930780705750",
                      "parentId": "8132044808088488",
                      "label": "sys.menu.clipboard",
                      "name": "Clipboard",
                      "type": 1,
                      "route": "clipboard",
                      "component": "/functions/clipboard/index.tsx"
                    }
                  ]
                },
                {
                  "id": "0194818428516575",
                  "parentId": "",
                  "label": "sys.menu.menulevel.index",
                  "name": "Menu Level",
                  "icon": "ic-menulevel",
                  "type": 0,
                  "route": "menu-level",
                  "order": 5,
                  "children": [
                    {
                      "id": "0144431332471389",
                      "parentId": "0194818428516575",
                      "label": "sys.menu.menulevel.1a",
                      "name": "Menu Level 1a",
                      "type": 1,
                      "route": "menu-level-1a",
                      "component": "/menu-level/menu-level-1a/index.tsx"
                    },
                    {
                      "id": "7572529636800586",
                      "parentId": "0194818428516575",
                      "label": "sys.menu.menulevel.1b.index",
                      "name": "Menu Level 1b",
                      "type": 0,
                      "route": "menu-level-1b",
                      "children": [
                        {
                          "id": "3653745576583237",
                          "parentId": "7572529636800586",
                          "label": "sys.menu.menulevel.1b.2a",
                          "name": "Menu Level 2a",
                          "type": 1,
                          "route": "menu-level-2a",
                          "component": "/menu-level/menu-level-1b/menu-level-2a/index.tsx"
                        },
                        {
                          "id": "4873136353891364",
                          "parentId": "7572529636800586",
                          "label": "sys.menu.menulevel.1b.2b.index",
                          "name": "Menu Level 2b",
                          "type": 0,
                          "route": "menu-level-2b",
                          "children": [
                            {
                              "id": "4233029726998055",
                              "parentId": "4873136353891364",
                              "label": "sys.menu.menulevel.1b.2b.3a",
                              "name": "Menu Level 3a",
                              "type": 1,
                              "route": "menu-level-3a",
                              "component": "/menu-level/menu-level-1b/menu-level-2b/menu-level-3a/index.tsx"
                            },
                            {
                              "id": "3298034742548454",
                              "parentId": "4873136353891364",
                              "label": "sys.menu.menulevel.1b.2b.3b",
                              "name": "Menu Level 3b",
                              "type": 1,
                              "route": "menu-level-3b",
                              "component": "/menu-level/menu-level-1b/menu-level-2b/menu-level-3b/index.tsx"
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "9406067785553476",
                  "parentId": "",
                  "label": "sys.menu.error.index",
                  "name": "Error",
                  "icon": "bxs:error-alt",
                  "type": 0,
                  "route": "error",
                  "order": 6,
                  "children": [
                    {
                      "id": "8557056851997154",
                      "parentId": "9406067785553476",
                      "label": "sys.menu.error.403",
                      "name": "403",
                      "type": 1,
                      "route": "403",
                      "component": "/sys/error/Page403.tsx"
                    },
                    {
                      "id": "5095669208159005",
                      "parentId": "9406067785553476",
                      "label": "sys.menu.error.404",
                      "name": "404",
                      "type": 1,
                      "route": "404",
                      "component": "/sys/error/Page404.tsx"
                    },
                    {
                      "id": "0225992135973772",
                      "parentId": "9406067785553476",
                      "label": "sys.menu.error.500",
                      "name": "500",
                      "type": 1,
                      "route": "500",
                      "component": "/sys/error/Page500.tsx"
                    }
                  ]
                },
                {
                  "id": "3981225257359246",
                  "parentId": "",
                  "label": "sys.menu.calendar",
                  "name": "Calendar",
                  "icon": "solar:calendar-bold-duotone",
                  "type": 1,
                  "route": "calendar",
                  "component": "/sys/others/calendar/index.tsx"
                },
                {
                  "id": "3513985683886393",
                  "parentId": "",
                  "label": "sys.menu.kanban",
                  "name": "kanban",
                  "icon": "solar:clipboard-bold-duotone",
                  "type": 1,
                  "route": "kanban",
                  "component": "/sys/others/kanban/index.tsx"
                },
                {
                  "id": "5455837930804461",
                  "parentId": "",
                  "label": "sys.menu.disabled",
                  "name": "Disabled",
                  "icon": "ic_disabled",
                  "type": 1,
                  "route": "disabled",
                  "status": 0,
                  "component": "/sys/others/calendar/index.tsx"
                },
                {
                  "id": "7728048658221587",
                  "parentId": "",
                  "label": "sys.menu.label",
                  "name": "Label",
                  "icon": "ic_label",
                  "type": 1,
                  "route": "label",
                  "newFeature": true,
                  "component": "/sys/others/blank.tsx"
                },
                {
                  "id": "5733704222120995",
                  "parentId": "",
                  "label": "sys.menu.frame",
                  "name": "Frame",
                  "icon": "ic_external",
                  "type": 0,
                  "route": "frame",
                  "children": [
                    {
                      "id": "9884486809510480",
                      "parentId": "5733704222120995",
                      "label": "sys.menu.external_link",
                      "name": "External Link",
                      "type": 1,
                      "route": "external_link",
                      "hideTab": true,
                      "component": "/sys/others/iframe/external-link.tsx",
                      "frameSrc": "https://ant.design/"
                    },
                    {
                      "id": "9299640886731819",
                      "parentId": "5733704222120995",
                      "label": "sys.menu.iframe",
                      "name": "Iframe",
                      "type": 1,
                      "route": "frame",
                      "component": "/sys/others/iframe/index.tsx",
                      "frameSrc": "https://ant.design/"
                    }
                  ]
                },
                {
                  "id": "0941594969900756",
                  "parentId": "",
                  "label": "sys.menu.blank",
                  "name": "Disabled",
                  "icon": "ic_blank",
                  "type": 1,
                  "route": "blank",
                  "component": "/sys/others/blank.tsx"
                }
              ]
            }
          },
          message: '登录成功'
        });
      } else {
        // console.log('密码验证失败');
        res.status(200).json({
          code: 0,
          message: '密码错误，请重新输入'
        });
      }


    } else {
      res.status(200).json({
        code: 0,
        message: '用户不存在，请重新输入'
      });

    }

  } catch (error) {
    console.log('error', error)
    res.status(500).json({
      message: '错误'
    });
  }

};

// 登出接口
const logout = async (req, res) => {
  const {
    token
  } = req.body;


  // 将 Token 添加到 BlacklistToken 表中
  await BlackToken.create({
    token
  });

  res.status(200).json({
    code: 1,
    message: '登出成功',
  });
};

// 创建新用户
const createUser = async (req, res) => {

  try {

    const {
      username,
      email = '',
      phone = '',
      isAdmin,
      ins = '',
      fb = '',
      weibo = '',
      zhihu = '',
      truename = ''
    } = req.body;
    let {
      password = ''
    } = req.body
    // 创建新的用户

    const user = await User.findOne({
      where: {
        deleted: 0,
        username
      }
    })
    if (user) {
      res.status(200).json({
        status: 2,
        message: '账号已存在，请修改',
      });
      return
    }

    const salt = generateRandomString(4)
    // 定义盐的轮数
    const saltRounds = 10;
    // 默认密码为123456
    if (password !== '') {
      console.log('有设置密码')
      // 使用 bcrypt 生成哈希密码
      password = bcrypt.hashSync(password + salt, saltRounds);
    } else {
      console.log('没有设置密码')
      password = bcrypt.hashSync('123456' + salt, saltRounds);
    }

    const newUser = await User.create({
      roleId: 1,
      username,
      password,
      isAdmin,
      salt,
      truename,
      email,
      phone
    });
    // 创建用户联系信息
    const newContactInfo = await Usercontactinfo.create({
      uid: newUser.id,
      ins,
      fb,
      weibo,
      zhihu
    });

    // 返回成功响应
    res.status(200).json({
      status: 1,
      message: '创建成功',
      // newUser,
      // newContactInfo
    });

  } catch (error) {
    // 处理错误情况
    console.error('Error creating user:', error);
    res.status(500).json({
      message: 'Error creating user'
    });
  }

};

// 删除用户
const deleteUser = async (req, res) => {
  const userId = req.body.id;
  try {
    // 更新 User 表
    const user = await User.findByPk(userId);
    user.deleted = 1;
    user.dTime = new Date();
    await user.save();

    // 更新 UserContactInfo 表
    const contactInfo = await Usercontactinfo.findOne({
      where: {
        uid: userId
      }
    });
    contactInfo.deleted = 1;
    contactInfo.dTime = new Date();
    await contactInfo.save();

    res.status(200).json({
      code: 1,
      message: '删除成功'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: '删除用户时发生错误'
    });
  }
};

// 修改用户
const updateUser = async (req, res) => {
  const userId = req.body.id;
  const {
    username,
    password,
    email,
    phone,
    fb,
    ins,
    weibo,
    zhihu,
    isAdmin
  } = req.body;

  try {
    // 更新 User 表
    const user = await User.findByPk(userId);
    user.username = username;
    // user.password = password;
    user.email = email;
    user.phone = phone;
    user.uTime = new Date(); // 设置 uTime 字段为当前时间
    user.isAdmin = isAdmin


    if (password !== '') {
      // 定义盐的轮数
      const saltRounds = 10;
      // 使用 bcrypt 生成哈希密码
      const hashedPassword = bcrypt.hashSync(password + req.user.salt, saltRounds);
      user.password = hashedPassword
    }
    await user.save();

    // 更新 UserContactInfo 表
    const contactInfo = await Usercontactinfo.findOne({
      where: {
        uid: userId
      }
    });
    if (contactInfo) {
      contactInfo.ins = ins;
      contactInfo.fb = fb;
      contactInfo.weibo = weibo;
      contactInfo.zhihu = zhihu;
      contactInfo.uTime = new Date();
      await contactInfo.save();
    }

    res.status(200).json({
      code: 1,
      message: '更新成功'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: '更新用户时发生错误'
    });
  }
};

module.exports = {
  createUser,
  deleteUser,
  updateUser,
  login,
  logout
};