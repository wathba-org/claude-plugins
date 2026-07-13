# Arabic ↔ English Glossary & Response Guide

Wathba (وثبة) serves the Arab developer community. Users write requests in Arabic (فصحى or dialect, especially Gulf/Saudi), English, or a mix ("اعمل لي integrate للـ payments"). The CLI's flags, codes, and output are English — translation happens at YOUR layer, both directions.

## Phrase → intent → command

| Arabic (variants) | Intent | Command path |
|---|---|---|
| ركّب / نزّل / ثبّت / حمّل wathba (وثبة) | Install the CLI | `curl -fsSL https://install.wathba.info/install.sh \| bash` → PATH → `wathba doctor` |
| حدّث / طوّر النسخة | Update CLI | `wathba update check` → `wathba self-update` |
| سجّل دخول / وثّق / أثبت الهوية | Authenticate | `wathba login --device --wait --json` |
| مين مسجّل؟ / وش حالة الجلسة؟ | Session status | `wathba auth status --json` |
| اطلع / سجّل خروج | Logout | `wathba auth logout --json` |
| سوّي / أنشئ / اعمل مشروع | Create project | `wathba project create --name ... --json` |
| اختر / حدد المشروع | Select project | `wathba project select <id> --json` |
| وش الخدمات الموجودة؟ / اعرض الخدمات | List services | `wathba service list --json` |
| فعّل / شغّل خدمة X | Activate service | setup → wait → activate flow (workflows §2) |
| جهّز / أعدّ خدمة X | Set up service | `wathba service setup <svc> --json` |
| عطّل / أوقف / شِل خدمة X | Deactivate | deactivate → wait `--until removed` |
| اربط / أضف / ركّب X في تطبيقي (الدفع، الرسائل، الشحن) | Integrate capability | `wathba integrate <cap> --json --no-input` (workflows §3) |
| كمّل / واصل / رجّع من حيث وقفنا | Resume | `wathba integrate resume <cap> --json --no-input` |
| وش صار؟ / وين وصلنا؟ / شنو الوضع؟ | Status | `integrate status` / `service status` |
| تأكد / تحقق / اختبر إنه شغال | Verify | `integrate verify` / `capability verify` |
| صلّح / اصلح المشكلة | Repair | `wathba integrate repair <cap> --json` |
| ارجع للنسخة القديمة / تراجع | Rollback | `integrate rollback` / `self-update --rollback` |
| احذف / أزل التكامل | Remove | `wathba integrate remove <cap> --json` |
| مفتاح / مفاتيح API / سوّي مفتاح | Keys | `wathba key create/list/... --json` |
| بدّل / دوّر المفتاح | Rotate key | `wathba key rotate <keyId> --json` |
| المفتاح انسرّب / انكشف | Compromised key | `wathba key compromise <keyId> --json` |
| افحص / شخّص / وش المشكلة بالجهاز | Diagnose | `wathba doctor --json` |

Domain nouns: الدفع/المدفوعات = payments · الرسائل/رمز التحقق = OTP messaging · الشحن/التوصيل = logistics/shipping · بيئة تجريبية = test environment · بيئة الإنتاج = production.

## Responding in Arabic

- Reply in Arabic when the user wrote Arabic; keep command names, flags, service/capability codes, URLs, and JSON fields in Latin script inside backticks — never transliterate or translate them (`wathba login --device`, not «وثبة لوقن»).
- State the final outcome plainly: «تم التفعيل ✅ الخدمة `payments` الآن `ACTIVE`» — quote the typed outcome verbatim alongside the Arabic explanation.
- For `ACTION_REQUIRED`: tell the user exactly what to do in Arabic, e.g. «افتح هذا الرابط ووافق على الطلب، وبعدها أكمل أنا الباقي:» + URL, then run `resume` after they confirm.
- For the device-login flow: «افتح الرابط التالي وأدخل الرمز: ...».
- Numbers, IDs, and codes stay as-is; dates can be localized.
- Mixed/Arabizi input ("sawwi login w fa33il el payments") → treat as Arabic intent; reply in Arabic unless the user's message was mostly English.
- Don't over-formalize: match the user's register (dialect question → natural, friendly فصحى/dialect mix is fine).

## Example

**User:** «ركب لي wathba وفعّل خدمة الرسائل otp-messaging في مشروعي»

**Agent does:** install script → PATH → `wathba doctor --json` → `wathba login --device --wait --json` (give user the URL/code in Arabic) → `wathba project select ... --json` → `wathba service setup otp-messaging --json` → branch on outcome → `... activate` → confirm `ACTIVE`.

**Agent replies (shape):**
> تم ✅
> 1. ثبّتّ wathba CLI وتأكدت من سلامة التثبيت (`wathba doctor`).
> 2. سجّلت الدخول بحسابك عبر رابط التحقق.
> 3. فعّلت خدمة `otp-messaging` — الحالة الآن `ACTIVE`.
> ما يحتاج أي خطوة إضافية منك.
