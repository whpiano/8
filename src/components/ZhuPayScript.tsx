'use client';

import Script from 'next/script';

// ZhuPay 支付 SDK 配置
const ZHUPAY_CONFIG = {
  API_HOST: 'https://pay.0728.im',
  QR_IMG: 'https://img.0728.im/zsm.png' // 收款码图片
};

// 注入 ZhuPay SDK 和样式
const ZHUPAY_SCRIPT = `
(function() {
  const CONFIG = ${JSON.stringify(ZHUPAY_CONFIG)};
  
  // 注入样式
  const style = document.createElement('style');
  style.innerHTML = \`
    .zp-mask{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;justify-content:center;align-items:center}
    .zp-box{background:#fff;padding:25px;border-radius:12px;width:300px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.2);position:relative}
    .zp-close{position:absolute;top:10px;right:15px;cursor:pointer;font-size:24px;color:#999}
    .zp-amt{font-size:28px;color:#f5222d;font-weight:700;display:block;margin:10px 0}
    .zp-qr{width:180px;height:180px;border:1px solid #eee;margin:10px auto;display:block}
    .zp-tip{font-size:12px;background:#fffbe6;color:#d48806;padding:8px;border-radius:4px;text-align:left}
    .zp-res{margin-top:15px;background:#f6ffed;border:1px solid #b7eb8f;padding:10px;display:none}
    .zp-code{font-family:monospace;font-size:20px;font-weight:700;color:#389e0d;user-select:all}
  \`;
  document.head.appendChild(style);

  // 注入DOM
  const div = document.createElement('div');
  div.innerHTML = \`
    <div id="zp-modal" class="zp-mask">
      <div class="zp-box">
        <span class="zp-close" onclick="ZhuPay.close()">&times;</span>
        <h3>扫码支付</h3>
        <div class="zp-tip">⚠️ 系统自动避让金额<br>请务必支付 <b style="color:red">精确金额</b> 否则不自动到账</div>
        <span class="zp-amt">¥<span id="zp-price">0.00</span></span>
        <img src="\${CONFIG.QR_IMG}" class="zp-qr">
        <div id="zp-status" style="color:#999;font-size:12px;margin-top:10px">正在创建订单...</div>
        <div id="zp-result" class="zp-res">
            <div style="font-size:12px;color:#666">支付成功！您的凭证码：</div>
            <div id="zp-code-val" class="zp-code"></div>
            <button onclick="ZhuPay.close()" style="margin-top:10px;padding:5px 15px;cursor:pointer">关闭</button>
        </div>
      </div>
    </div>\`;
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
        const res = await fetch(\`\${CONFIG.API_HOST}/api/create\`, {
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
          const res = await fetch(\`\${host}/api/check_status?amount=\${amt}\`);
          const data = await res.json();
          if(data.paid) {
            clearInterval(timer);
            document.getElementById('zp-status').innerText = "✅ 支付成功";
            document.getElementById('zp-result').style.display = 'block';
            document.getElementById('zp-code-val').innerText = data.code;
            if(this.callback) this.callback(data.code);
          }
        } catch(e){}
      }, 2000);
    }
  };
})();
`;

export default function ZhuPayScript() {
  return (
    <Script
      id="zhupay-sdk"
      strategy="afterInteractive"
    >
      {ZHUPAY_SCRIPT}
    </Script>
  );
}
