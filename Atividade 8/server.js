const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); // Para gerar IDs únicos

const DB_FILE = path.join(__dirname, 'data', 'db.json');

// Função auxiliar para ler o banco
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
// Função auxiliar para salvar no banco
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// Função auxiliar para ler o body das requisições
const getBody = (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => resolve(body ? JSON.parse(body) : {}));
        req.on('error', reject);
    });
};

const server = http.createServer(async (req, res) => {
    // 1. SERVIDOR DE ARQUIVOS ESTÁTICOS (Front-end)
    if (!req.url.startsWith('/api')) {
        let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
        const extname = path.extname(filePath);
        const contentTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
        
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Página não encontrada');
            } else {
                res.writeHead(200, { 'Content-Type': contentTypes[extname] || 'text/plain' });
                res.end(content);
            }
        });
        return;
    }

    // 2. API REST
    res.setHeader('Content-Type', 'application/json');
    const urlParts = req.url.split('/');
    const resource = urlParts[2]; // 'produtos' ou 'fornecedores'
    const id = urlParts[3]; // ID, se houver
    
    try {
        const db = readDB();

        // --- ENDPOINTS PARA FORNECEDORES ---
        if (resource === 'fornecedores') {
            if (req.method === 'GET' && !id) {
                return res.writeHead(200).end(JSON.stringify(db.fornecedores));
            }
            if (req.method === 'POST') {
                const data = await getBody(req);
                if (db.fornecedores.some(f => f.cnpj === data.cnpj)) {
                    return res.writeHead(400).end(JSON.stringify({ error: 'CNPJ já cadastrado!' }));
                }
                data.id = crypto.randomUUID();
                db.fornecedores.push(data);
                writeDB(db);
                return res.writeHead(201).end(JSON.stringify(data));
            }
            if (req.method === 'DELETE' && id) {
                // Regra: Impedir exclusão se houver produto vinculado
                if (db.produtos.some(p => p.fornecedorId === id)) {
                    return res.writeHead(400).end(JSON.stringify({ error: 'Fornecedor possui produtos vinculados!' }));
                }
                const index = db.fornecedores.findIndex(f => f.id === id);
                if (index !== -1) {
                    db.fornecedores.splice(index, 1);
                    writeDB(db);
                    return res.writeHead(200).end(JSON.stringify({ message: 'Excluído com sucesso' }));
                }
                return res.writeHead(404).end(JSON.stringify({ error: 'Não encontrado' }));
            }
        }

        // --- ENDPOINTS PARA PRODUTOS ---
        if (resource === 'produtos') {
            if (req.method === 'GET' && !id) {
                return res.writeHead(200).end(JSON.stringify(db.produtos));
            }
            if (req.method === 'POST') {
                const data = await getBody(req);
                if (data.preco < 0 || data.quantidade < 0) {
                    return res.writeHead(400).end(JSON.stringify({ error: 'Valores não podem ser negativos!' }));
                }
                if (db.produtos.some(p => p.codigo === data.codigo)) {
                    return res.writeHead(400).end(JSON.stringify({ error: 'Código de produto já existe!' }));
                }
                data.id = crypto.randomUUID();
                db.produtos.push(data);
                writeDB(db);
                return res.writeHead(201).end(JSON.stringify(data));
            }
            if (req.method === 'DELETE' && id) {
                db.produtos = db.produtos.filter(p => p.id !== id);
                writeDB(db);
                return res.writeHead(200).end(JSON.stringify({ message: 'Excluído' }));
            }
        }

        // Rota não encontrada na API
        res.writeHead(404).end(JSON.stringify({ error: 'Rota da API inexistente' }));

    } catch (error) {
        res.writeHead(500).end(JSON.stringify({ error: 'Erro interno no servidor' }));
    }
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));