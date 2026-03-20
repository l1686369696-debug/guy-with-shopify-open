require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// 从 Render 的环境变量中读取
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
// 例如：https://your-app-name.onrender.com (注意结尾不要带斜杠)
const HOST = process.env.HOST;

// 申请的权限：订单、库存、商品、客户 (最适合 Vape 店铺自动化)
const SCOPES = 'read_products,write_products,read_orders,write_orders,read_inventory,write_inventory,read_customers';

app.get('/', (req, res) => {
    res.send('Shopify OAuth Server is running on Render! ✨');
});

// 第一步：访问此路由开始授权
app.get('/auth', (req, res) => {
    const shop = req.query.shop;
    if (!shop) return res.status(400).send('Missing shop parameter (e.g., ?shop=29dc29-b8.myshopify.com)');
    
    const state = crypto.randomBytes(16).toString('hex');
    const redirectUri = `${HOST}/auth/callback`;
    
    // 跳转到 Shopify 的安装授权页面
    const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SCOPES}&state=${state}&redirect_uri=${redirectUri}`;
    
    res.redirect(installUrl);
});

// 第二步：Shopify 授权后的回调路由
app.get('/auth/callback', async (req, res) => {
    const { shop, hmac, code, state } = req.query;

    if (!shop || !hmac || !code) {
        return res.status(400).send('Required parameters missing');
    }
    
    // 用临时 code 换取永久 Access Token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    
    try {
        const response = await axios.post(tokenUrl, {
            client_id: SHOPIFY_API_KEY,
            client_secret: SHOPIFY_API_SECRET,
            code,
        });

        const accessToken = response.data.access_token;
        
        // 打印在 Render 的控制台里
        console.log(`\n================================`);
        console.log(`🎉 成功获取 Access Token! 店铺: ${shop}`);
        console.log(`Token: ${accessToken}`);
        console.log(`================================\n`);
        
        res.send(`
            <div style="font-family: sans-serif; padding: 40px;">
                <h1 style="color: #4caf50;">OAuth 授权成功！🎉</h1>
                <p>店铺: <b>${shop}</b></p>
                <p style="font-size: 18px;">请立即前往 <b>Render 的 Logs（日志）控制台</b> 查看并复制你的永久 Access Token！</p>
                <p style="color: #888;">拿到 Token 后，发给你的 AI 助手，我们就可以开始写自动化脚本了。</p>
            </div>
        `);
    } catch (error) {
        console.error('Error exchanging token:', error.response ? error.response.data : error.message);
        res.status(500).send('获取 Token 失败，请检查 Render Logs。');
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
