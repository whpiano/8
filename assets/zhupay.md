这份文档旨在帮助开发者将 **ZhuPay (个人免签支付系统)** 集成到各种业务场景中。

无论你是静态博客、Node.js 应用、Python 后台，还是 Java/Go 系统，集成的核心逻辑都是统一的：**“前端获取凭证，后端验证凭证”**。

---

# 📚 ZhuPay 通用接入与开发文档

## 1. 核心原理
本系统采用**“凭证验证模式”**。与支付宝/微信官方的“回调通知模式”不同，本系统的流程如下：
1.  **前端**：用户发起支付 -> 支付成功 -> 系统返回一个 **8位查询码 (Code)**。
2.  **前端**：用户将这个 `Code` 作为参数提交给你的业务接口。
3.  **后端**：你的服务器拿着 `Code` 去调用支付网关查询，确认金额和支付时间。
4.  **后端**：验证通过后，发放权益（如升级会员、充值余额、发货）。

---

## 2. 前端集成 (通用组件)

将以下代码放入你网站的 `<body>` 结束标签前。它可以自动处理创建订单、弹窗、轮询查单的全过程。

### 2.1 引入 SDK
```html
<script>
(function() {
  // === 配置项 ===
  const CONFIG = {
    API_HOST: "https://pay.0728.im", // 你的支付系统域名
    QR_IMG: "https://img.0728.im/zsm.png" // 你的收款码图片
  };

  // 注入样式
  const style = document.createElement('style');
  style.innerHTML = `
    .zp-mask{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;justify-content:center;align-items:center}
    .zp-box{background:#fff;padding:25px;border-radius:12px;width:300px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.2);position:relative}
    .zp-close{position:absolute;top:10px;right:15px;cursor:pointer;font-size:24px;color:#999}
    .zp-amt{font-size:28px;color:#f5222d;font-weight:700;display:block;margin:10px 0}
    .zp-qr{width:180px;height:180px;border:1px solid #eee;margin:10px auto;display:block}
    .zp-tip{font-size:12px;background:#fffbe6;color:#d48806;padding:8px;border-radius:4px;text-align:left}
    .zp-res{margin-top:15px;background:#f6ffed;border:1px solid #b7eb8f;padding:10px;display:none}
    .zp-code{font-family:monospace;font-size:20px;font-weight:700;color:#389e0d;user-select:all}
  `;
  document.head.appendChild(style);

  // 注入DOM
  const div = document.createElement('div');
  div.innerHTML = `
    <div id="zp-modal" class="zp-mask">
      <div class="zp-box">
        <span class="zp-close" onclick="ZhuPay.close()">&times;</span>
        <h3>扫码支付</h3>
        <div class="zp-tip">⚠️ 系统自动避让金额<br>请务必支付 <b style="color:red">精确金额</b> 否则不自动到账</div>
        <span class="zp-amt">¥<span id="zp-price">0.00</span></span>
        <img src="${CONFIG.QR_IMG}" class="zp-qr">
        <div id="zp-status" style="color:#999;font-size:12px;margin-top:10px">正在创建订单...</div>
        <div id="zp-result" class="zp-res">
            <div style="font-size:12px;color:#666">支付成功！您的凭证码：</div>
            <div id="zp-code-val" class="zp-code"></div>
            <button onclick="ZhuPay.close()" style="margin-top:10px;padding:5px 15px;cursor:pointer">关闭</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(div);

  // 全局对象
  let timer = null;
  window.ZhuPay = {
    callback: null,
    close: function() {
      document.getElementById('zp-modal').style.display = 'none';
      document.getElementById('zp-result').style.display = 'none';
      if(timer) clearInterval(timer);
    },
    open: async function(price, desc, onSuccess) {
      this.callback = onSuccess;
      const modal = document.getElementById('zp-modal');
      const status = document.getElementById('zp-status');
      
      modal.style.display = 'flex';
      status.innerText = "正在连接支付网关...";
      
      try {
        const res = await fetch(`${CONFIG.API_HOST}/api/create`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ price: Number(price), content: desc || 'API支付' })
        });
        const data = await res.json();
        
        if(data.success) {
          document.getElementById('zp-price').innerText = data.real_amount.toFixed(2);
          status.innerText = "请扫码支付，等待自动跳转...";
          this.poll(CONFIG.API_HOST, data.real_amount);
        } else {
          alert("创建失败: " + data.error);
          this.close();
        }
      } catch(e) { alert("网络错误"); this.close(); }
    },
    poll: function(host, amt) {
      if(timer) clearInterval(timer);
      timer = setInterval(async () => {
        try {
          const res = await fetch(`${host}/api/check_status?amount=${amt}`);
          const data = await res.json();
          if(data.paid) {
            clearInterval(timer);
            // 支付成功
            document.getElementById('zp-status').innerText = "✅ 支付成功";
            document.getElementById('zp-result').style.display = 'block';
            document.getElementById('zp-code-val').innerText = data.code;
            
            // 执行回调
            if(this.callback) this.callback(data.code);
          }
        } catch(e){}
      }, 2000);
    }
  };
})();
</script>
```

### 2.2 调用方式
在需要触发支付的按钮上：

```javascript
// ZhuPay.open(金额, 备注, 成功回调函数)

ZhuPay.open(10.00, "购买VIP", function(code) {
    console.log("支付成功，拿到凭证:", code);
    // 在这里触发下一步业务，比如提交到你的后端
    submitOrderToBackend(code);
});
```

---

## 3. 后端接口规范 (API Reference)

你的业务后端需要调用此接口来验证订单的有效性。

### 验证接口：查询凭证详情
*   **URL**: `https://pay.0728.im/api/query_reply`
*   **Method**: `POST`
*   **Content-Type**: `application/json`

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `code` | string | 是 | 前端传来的8位查询码 |

**返回示例 (成功)：**
```json
{
  "amount": 10.01,
  "content": "购买VIP",
  "reply": null,
  "paid_at": 1715000000000,
  "status": "waiting"
}
```

**返回示例 (失败)：**
```json
{
  "error": "查询码无效"
}
```

---

## 4. 业务集成场景示例

### 场景 A：付费解锁内容 (如阅读文章、下载资源)
**流程**：用户支付 -> 拿到码 -> 提交码 -> 后端验证 -> 返回内容。

**后端代码示例 (Node.js/Express):**
```javascript
const axios = require('axios');

app.post('/api/unlock_article', async (req, res) => {
    const { payment_code, article_id } = req.body;

    // 1. 去支付网关查这个码是否有效
    try {
        const verify = await axios.post('https://pay.0728.im/api/query_reply', {
            code: payment_code
        });

        // 2. 检查金额是否足够 (例如文章价格 5元)
        if (verify.data.amount < 5.00) {
            return res.status(400).json({ msg: "支付金额不足" });
        }

        // 3. (可选) 检查该码是否已被使用过，防止多人共享一个码
        // const isUsed = await db.query('SELECT * FROM used_codes WHERE code = ?', [payment_code]);
        // if (isUsed) return res.status(400).json({ msg: "该码已失效" });

        // 4. 验证通过，返回隐藏内容
        res.json({ 
            success: true, 
            content: "这里是付费文章的核心内容..." 
        });
        
        // 5. 标记该码已使用
        // await db.insert('used_codes', { code: payment_code });

    } catch (e) {
        res.status(400).json({ msg: "凭证无效或网络错误" });
    }
});
```

### 场景 B：用户充值余额 / 购买积分
**流程**：用户支付 -> 拿到码 -> 提交码 -> 后端验证 -> 账户余额增加 -> **销毁码**。

**后端代码示例 (Python/Flask):**
```python
import requests

@app.route('/api/recharge', methods=['POST'])
def recharge():
    user_id = request.json.get('user_id')
    code = request.json.get('code')

    # 1. 检查本地数据库，防止重放攻击 (Replay Attack)
    if db.exists(f"used_code:{code}"):
        return jsonify({"error": "该充值码已使用"}), 400

    # 2. 远程验证
    resp = requests.post("https://pay.0728.im/api/query_reply", json={"code": code})
    if resp.status_code != 200:
        return jsonify({"error": "无效的充值码"}), 400
    
    data = resp.json()
    amount = data['amount']

    # 3. 业务逻辑：给用户加钱
    user = db.get_user(user_id)
    user.balance += amount
    user.save()

    # 4. 关键：将码标记为已使用
    db.set(f"used_code:{code}", "true")

    return jsonify({"success": True, "new_balance": user.balance})
```

---

## 5. 常见问题 (FAQ)

**Q1: 为什么用户支付的金额和设定的不一样？**
A: 这是为了区分并发订单。如果有两个人同时想付 10 元，系统会提示 A 付 10.00，提示 B 付 10.01。后端验证时，**请务必允许金额有微小的正向浮动**，或者只判断 `amount >= 商品原价`。

**Q2: 那个 `Code` 也就是查询码，会重复吗？**
A: 8位大写字母+数字组合，重复概率极低，且 Worker 内部有校验机制。在业务层面，建议将其作为**一次性 Token** 使用。

**Q3: 如何防止用户不付钱直接调接口？**
A: 你的业务接口必须强制校验 `Code`。不要在前端做 `if (paySuccess)` 的跳转，所有敏感操作必须在后端通过验证 `Code` 后执行。

**Q4: 支付网关挂了怎么办？**
A: 该方案依赖 Cloudflare Workers，稳定性极高。但作为兜底，你可以建议用户保存支付截图，并在后台人工处理。