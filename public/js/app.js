// --- UTILIDADES ---
function mostrarSessao(id) {
    document.getElementById('sec-produtos').style.display = id === 'produtos' ? 'block' : 'none';
    document.getElementById('sec-fornecedores').style.display = id === 'fornecedores' ? 'block' : 'none';
}

function exibirMensagem(msg, tipo = 'sucesso') {
    const div = document.getElementById('mensagem-alerta');
    div.textContent = msg;
    div.className = tipo;
    setTimeout(() => div.textContent = '', 3000);
}

// --- INTEGRAÇÃO BRASIL API ---
async function buscarCNPJ() {
    const cnpj = document.getElementById('cnpj').value.replace(/\D/g, '');
    if (cnpj.length !== 14) return exibirMensagem('CNPJ inválido (digite 14 números)', 'erro');
    
    try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (!res.ok) throw new Error('CNPJ não encontrado ou erro na API');
        
        const data = await res.json();
        document.getElementById('razao').value = data.razao_social || '';
        document.getElementById('fantasia').value = data.nome_fantasia || data.razao_social || '';
        document.getElementById('telefone').value = data.ddd_telefone_1 || '';
        document.getElementById('endereco').value = `${data.logradouro}, ${data.municipio} - ${data.uf}`;
        exibirMensagem('Dados preenchidos via BrasilAPI!');
    } catch (error) {
        exibirMensagem(error.message, 'erro');
    }
}

// --- FORNECEDORES ---
document.getElementById('form-fornecedor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fornecedor = {
        cnpj: document.getElementById('cnpj').value,
        razao: document.getElementById('razao').value,
        fantasia: document.getElementById('fantasia').value,
        telefone: document.getElementById('telefone').value,
        endereco: document.getElementById('endereco').value
    };

    const res = await fetch('/api/fornecedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fornecedor)
    });

    if (res.ok) {
        exibirMensagem('Fornecedor salvo!');
        e.target.reset();
        carregarFornecedores();
    } else {
        const err = await res.json();
        exibirMensagem(err.error, 'erro');
    }
});

async function carregarFornecedores() {
    const res = await fetch('/api/fornecedores');
    const fornecedores = await res.json();
    
    const lista = document.getElementById('lista-fornecedores');
    const select = document.getElementById('p-fornecedor');
    lista.innerHTML = ''; select.innerHTML = '<option value="">Selecione...</option>';

    fornecedores.forEach(f => {
        lista.innerHTML += `<li>${f.fantasia} (${f.cnpj}) <button onclick="deletarFornecedor('${f.id}')">Excluir</button></li>`;
        select.innerHTML += `<option value="${f.id}">${f.fantasia}</option>`;
    });
}

async function deletarFornecedor(id) {
    if (!confirm('Deseja realmente excluir este fornecedor?')) return;
    const res = await fetch(`/api/fornecedores/${id}`, { method: 'DELETE' });
    if (res.ok) {
        exibirMensagem('Excluído com sucesso');
        carregarFornecedores();
    } else {
        const err = await res.json();
        exibirMensagem(err.error, 'erro');
    }
}

// --- PRODUTOS ---
document.getElementById('form-produto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const produto = {
        codigo: document.getElementById('p-codigo').value,
        nome: document.getElementById('p-nome').value,
        categoria: document.getElementById('p-cat').value,
        preco: parseFloat(document.getElementById('p-preco').value),
        quantidade: parseInt(document.getElementById('p-qtd').value),
        fornecedorId: document.getElementById('p-fornecedor').value
    };

    const res = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(produto)
    });

    if (res.ok) {
        exibirMensagem('Produto salvo!');
        e.target.reset();
        carregarProdutos();
    } else {
        const err = await res.json();
        exibirMensagem(err.error, 'erro');
    }
});

async function carregarProdutos() {
    const termoBusca = document.getElementById('busca-produto').value.toLowerCase();
    const res = await fetch('/api/produtos');
    let produtos = await res.json();
    
    // Filtragem de pesquisa no front
    if (termoBusca) {
        produtos = produtos.filter(p => p.nome.toLowerCase().includes(termoBusca));
    }

    const tbody = document.querySelector('#tabela-produtos tbody');
    tbody.innerHTML = '';
    let valorTotal = 0;

    produtos.forEach(p => {
        valorTotal += (p.preco * p.quantidade);
        // Destacar quantidade menor que 5
        const classeBaixo = p.quantidade < 5 ? 'estoque-baixo' : '';
        
        tbody.innerHTML += `
            <tr class="${classeBaixo}">
                <td>${p.codigo}</td>
                <td>${p.nome}</td>
                <td>${p.quantidade}</td>
                <td>R$ ${p.preco.toFixed(2)}</td>
                <td><button onclick="deletarProduto('${p.id}')">Excluir</button></td>
            </tr>
        `;
    });

    document.getElementById('valor-total').textContent = `R$ ${valorTotal.toFixed(2)}`;
}

async function deletarProduto(id) {
    if (!confirm('Deseja excluir este produto?')) return;
    await fetch(`/api/produtos/${id}`, { method: 'DELETE' });
    carregarProdutos();
}

// Inicialização
carregarFornecedores();
carregarProdutos();