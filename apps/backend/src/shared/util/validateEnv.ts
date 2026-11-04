import Joi from 'joi';

// 依 ENABLE_FIAS / FIAS_MODE 的目前組合，
// 驗證對應必填的環境變數是否存在。詳細分類請見 apps/backend/.env.example。
const schema = Joi.object({
  CLIENT_ID: Joi.string().required(),

  ENABLE_FIAS: Joi.string().valid('true', 'false').optional(),

  // 站點時區（IANA 格式，例如 Asia/Taipei）：排程時間換算與前端顯示皆以此為準
  SITE_TIMEZONE: Joi.string()
    .custom((value: string, helpers) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value });
        return value;
      } catch {
        return helpers.error('any.invalid');
      }
    })
    .required(),

  FREESWITCH_API_URL: Joi.string().required(),
  FREESWITCH_API_KEY: Joi.string().allow('').optional(),
  // 撥號時組 callback_url 用（middleware 回呼通話結果），缺漏會導致接聽判定/重試機制失效
  FREESWITCH_CALLBACK_BASE_URL: Joi.string().required(),

  // FIAS Middleware（Lakeshore Check-in/Check-out 用）：freeSwitchPmsApi.ts 以字串模板讀值，
  // 未設定會變成 "undefined" 字串送出，故必須明確設定
  FREESWITCH_PMS_API_URL: Joi.string().allow('').optional(),
  FREESWITCH_PMS_API_KEY: Joi.string().required(),
  FREESWITCH_PMS_DOMAIN_NAME: Joi.string().required(),

  FIAS_PMS_HOST: Joi.string().when('ENABLE_FIAS', {
    is: 'false',
    then: Joi.allow(''),
    otherwise: Joi.when('FIAS_MODE', { is: 'client', then: Joi.required(), otherwise: Joi.allow('') }),
  }),
  FIAS_PMS_PORT: Joi.string().when('ENABLE_FIAS', {
    is: 'false',
    then: Joi.allow(''),
    otherwise: Joi.when('FIAS_MODE', { is: 'client', then: Joi.required(), otherwise: Joi.allow('') }),
  }),
});

// 缺漏變數依此分組印出，順序即為報錯時的顯示順序
const VAR_GROUPS: [string, string[]][] = [
  ['通用設定', ['CLIENT_ID', 'SITE_TIMEZONE']],
  ['FreeSwitch', ['FREESWITCH_API_URL', 'FREESWITCH_CALLBACK_BASE_URL', 'FREESWITCH_PMS_API_KEY', 'FREESWITCH_PMS_DOMAIN_NAME']],
  ['FIAS PMS 整合', ['FIAS_PMS_HOST', 'FIAS_PMS_PORT']],
];

/**
 * 依目前的 FIAS 模式驗證 process.env，
 * 缺漏或填錯會一次列出並終止服務（process.exit(1)）。
 */
export function validateEnv(): void {
  const { error } = schema.validate(process.env, { abortEarly: false, allowUnknown: true });
  if (!error) return;

  const invalidVars = new Set(error.details.map((detail) => String(detail.path[0])));

  console.error('[FATAL] 環境變數設定不完整或有誤，請檢查 .env 檔案後重新啟動：\n');
  for (const [group, vars] of VAR_GROUPS) {
    const missing = vars.filter((name) => invalidVars.has(name));
    if (missing.length === 0) continue;
    console.error(`  ${group}：`);
    for (const name of missing) {
      console.error(`    - ${name}`);
    }
  }
  console.error('\n詳細規則請參考 apps/backend/.env.example');
  process.exit(1);
}
