# Arabic intent and response guide

Reply in Arabic when the user writes Arabic. Keep commands, flags, IDs, service
codes, capability codes, URLs, and JSON fields in Latin script.

| Arabic intent | Meaning | Safe action |
|---|---|---|
| ركّب / نزّل / ثبّت وثبة | Install Wathba | installer → `wathba doctor --json` |
| سجّل دخول / وثّق | Authenticate | `wathba login --no-input --json`, then `wathba auth complete --no-input --json` after approval |
| سوّي / أنشئ مشروع | Create project | `wathba project create --name ... --json` |
| اختر المشروع | Select context | `wathba project select <id> --environment <id> --json` |
| وش الخدمات؟ | List services | `wathba service list --json --no-input` |
| فعّل / شغّل Torod أو Authenta | Enable member service | check `service status`; explain that a Wathba operator enables it once for the member |
| فعّل Moyasar / الدفع | Enable payments | check `service status`; explain that a Wathba operator enables it for this project |
| اربط الدفع / الرسائل / الشحن بتطبيقي | Integrate capability | connect the read-only MCP, then run `wathba integrate inspect --project-dir . --json --no-input` |
| كمّل / واصل | Continue | re-read the pinned MCP guide and continue the repository's own implementation plan |
| وش صار؟ / وين وصلنا؟ | Status | report local tests plus current `get_project_setup` and `get_service_integration_docs` facts |
| تحقق / اختبر | Verify | run repository tests; use MCP Inspector to verify MCP reads |
| رجّع / استرجع المبلغ | Refund | request the normalized refund with an `Idempotency-Key`, then poll its status (see `references/payments.md`) |
| المفتاح انكشف | Contain key | direct the authorized human to contain and replace it in the protected portal |
| افحص المشكلة | Diagnose | `wathba doctor --json` plus the relevant read-only status |

Do not translate an enablement request into removed member setup or activation
commands. A good disabled response is:

> الخدمة `shipping.torod` غير مفعّلة حالياً. تفعيلها يتم من فريق وثبة مرة
> واحدة على مستوى العضو، وبعدها تقدر تستخدمها في كل مشاريعك. أقدر أراقب الحالة
> عبر `wathba service wait shipping.torod --until enabled`.

For Moyasar say clearly that enablement is per project. For an enabled service,
use the hosted read-only MCP and report the pinned guide and local test result.

Never ask the user to paste a project API key, Torod/Moyasar/Authenta password,
provider credential, webhook secret, or funding detail into chat. The authorized
human configures the project key directly on the trusted server.
