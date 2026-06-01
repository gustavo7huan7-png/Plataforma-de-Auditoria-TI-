/* ==========================================
   PLATAFORMA DE AUDITORIA DE TI CAMPELO - LÓGICA
   Core: IndexedDB, Canvas Resize, Chart.js, html2pdf.js
   ========================================== */

// Configurações globais e referências de gráficos
let bd = null;
let graficoBios = null;
let graficoPerifericos = null;
let base64PrevisualizacaoAtual = "";
let idLojaEditando = null;
let idPdvEditando = null;
let idTecnicoEditando = null;

// Inicialização da Aplicação
document.addEventListener("DOMContentLoaded", () => {
    inicializarBancoDeDados()
        .then(() => {
            configurarOuvintesEventos();
            carregarFiltrosLojas();
            alternarAba("aba-painel");
            exibirNotificacao("Plataforma carregada e pronta!", "sucesso");
            registrarLog("INFO", "Plataforma carregada e inicializada com sucesso.");
        })
        .catch(erro => {
            console.error("Erro na inicialização:", erro);
            exibirNotificacao("Erro ao inicializar o banco de dados local.", "erro");
        });
});

// ==========================================
// 1. BANCO DE DADOS (Wrapper IndexedDB)
// ==========================================
function inicializarBancoDeDados() {
    return new Promise((resolver, rejeitar) => {
        const requisicao = indexedDB.open("CampeloAuditDB", 3);

        requisicao.onupgradeneeded = (evento) => {
            const bancoDeDados = evento.target.result;

            // Criar Store de Lojas
            if (!bancoDeDados.objectStoreNames.contains("lojas")) {
                bancoDeDados.createObjectStore("lojas", { keyPath: "id", autoIncrement: true });
            }
            // Criar Store de PDVs
            if (!bancoDeDados.objectStoreNames.contains("pdvs")) {
                const storePdvs = bancoDeDados.createObjectStore("pdvs", { keyPath: "id", autoIncrement: true });
                storePdvs.createIndex("loja_id", "loja_id", { unique: false });
            }
            // Criar Store de Auditorias
            if (!bancoDeDados.objectStoreNames.contains("auditorias")) {
                const storeAuditorias = bancoDeDados.createObjectStore("auditorias", { keyPath: "id", autoIncrement: true });
                storeAuditorias.createIndex("pdv_id", "pdv_id", { unique: false });
                storeAuditorias.createIndex("data", "data", { unique: false });
            }
            // Criar Store de Técnicos
            if (!bancoDeDados.objectStoreNames.contains("tecnicos")) {
                bancoDeDados.createObjectStore("tecnicos", { keyPath: "id", autoIncrement: true });
            }
            // Criar Store de Logs
            if (!bancoDeDados.objectStoreNames.contains("logs")) {
                bancoDeDados.createObjectStore("logs", { keyPath: "id", autoIncrement: true });
            }
        };

        requisicao.onsuccess = (evento) => {
            bd = evento.target.result;
            // Verificar e semear dados se estiver vazio
            semearBancoDeDadosSeVazio()
                .then(resolver)
                .catch(rejeitar);
        };

        requisicao.onerror = (evento) => rejeitar(evento.target.error);
    });
}

// Semente de Dados (Seeding)
async function semearBancoDeDadosSeVazio() {
    const transacao = bd.transaction(["lojas", "pdvs", "auditorias", "tecnicos", "logs"], "readwrite");
    const storeLojas = transacao.objectStore("lojas");
    const storePdvs = transacao.objectStore("pdvs");
    const storeAuditorias = transacao.objectStore("auditorias");
    const storeTecnicos = transacao.objectStore("tecnicos");
    const storeLogs = transacao.objectStore("logs");

    // Verificar se já possui lojas
    const requisicaoContagem = storeLojas.count();
    return new Promise((resolver, rejeitar) => {
        requisicaoContagem.onsuccess = async () => {
            if (requisicaoContagem.result === 0) {
                console.log("Banco de dados vazio! Semeando dados padrão...");
                
                // 0. Semear Técnicos
                const dadosTecnicos = [
                    { id: 1, nome: "Carlos Silva", email: "carlos.silva@campelo.com.br", telefone: "(63) 98401-2211" },
                    { id: 2, nome: "Ana Souza", email: "ana.souza@campelo.com.br", telefone: "(63) 98112-4455" },
                    { id: 3, nome: "Mateus Oliveira", email: "mateus.oliveira@campelo.com.br", telefone: "(63) 99204-7788" }
                ];
                dadosTecnicos.forEach(t => storeTecnicos.add(t));

                // 1. Semear Lojas
                const dadosLojas = [
                    { id: 1, nome: "Campelo Centro", localizacao: "Av. Bernardo Sayão, 1200, Centro - Araguaína/TO" },
                    { id: 2, nome: "Campelo Filadélfia", localizacao: "Rua Filadélfia, 450, Setor Oeste - Araguaína/TO" },
                    { id: 3, nome: "Campelo Entroncamento", localizacao: "Rodovia BR-153, KM 2, Entroncamento - Araguaína/TO" }
                ];
                dadosLojas.forEach(loja => storeLojas.add(loja));

                // 2. Semear PDVs (Caixas)
                const dadosPdvs = [
                    // Loja 1: Centro
                    { id: 1, loja_id: 1, numero_caixa: 1, so: "Windows 10 IoT Enterprise", versao: "21H2", ram: 4, bios: "Legacy" },
                    { id: 2, loja_id: 1, numero_caixa: 2, so: "Windows 10 IoT Enterprise", versao: "21H2", ram: 8, bios: "UEFI" },
                    { id: 3, loja_id: 1, numero_caixa: 3, so: "Ubuntu 22.04 LTS", versao: "2.0.4", ram: 4, bios: "Legacy" },
                    { id: 4, loja_id: 1, numero_caixa: 4, so: "Windows 10 Pro", versao: "22H2", ram: 16, bios: "UEFI" },
                    
                    // Loja 2: Filadélfia
                    { id: 5, loja_id: 2, numero_caixa: 1, so: "Windows 10 IoT Enterprise", versao: "21H2", ram: 4, bios: "Legacy" },
                    { id: 6, loja_id: 2, numero_caixa: 2,소: "Windows 10 IoT Enterprise", versao: "21H2", ram: 8, bios: "UEFI" },
                    { id: 7, loja_id: 2, numero_caixa: 3, so: "Ubuntu 22.04 LTS", versao: "2.0.4", ram: 8, bios: "UEFI" },
                    
                    // Loja 3: Entroncamento
                    { id: 8, loja_id: 3, numero_caixa: 1, so: "Windows 10 IoT Enterprise", versao: "21H2", ram: 4, bios: "Legacy" },
                    { id: 9, loja_id: 3, numero_caixa: 2, so: "Windows 10 IoT Enterprise", versao: "21H2", ram: 4, bios: "Legacy" },
                    { id: 10, loja_id: 3, numero_caixa: 3, so: "Windows 10 Pro", versao: "22H2", ram: 16, bios: "UEFI" }
                ];
                // Correção ortográfica de propriedade ao semear
                dadosPdvs[5].so = "Windows 10 IoT Enterprise";
                dadosPdvs.forEach(pdv => storePdvs.add(pdv));

                // 3. Imagem marcadora padrão
                const imagemMarcadora = criarImagemMarcadora();

                // 4. Semear Auditorias Históricas
                const dadosAuditorias = [
                    {
                        id: 1,
                        pdv_id: 1,
                        data: new Date("2026-05-10T10:00:00").toISOString(),
                        tecnico: "Carlos Silva",
                        status_impressora: "Atenção",
                        status_leitor: "OK",
                        status_teclado_mouse: "OK",
                        estado_gabinete: "OK",
                        observacoes: "Impressora térmica apresenta falha no corte (guilhotina cega). Necessário troca.",
                        imagem_url: imagemMarcadora
                    },
                    {
                        id: 2,
                        pdv_id: 2,
                        data: new Date("2026-05-12T14:30:00").toISOString(),
                        tecnico: "Carlos Silva",
                        status_impressora: "OK",
                        status_leitor: "OK",
                        status_teclado_mouse: "OK",
                        estado_gabinete: "OK",
                        observacoes: "Equipamento limpo e funcionando perfeitamente.",
                        imagem_url: imagemMarcadora
                    },
                    {
                        id: 3,
                        pdv_id: 3,
                        data: new Date("2026-05-15T09:15:00").toISOString(),
                        tecnico: "Carlos Silva",
                        status_impressora: "OK",
                        status_leitor: "Atenção",
                        status_teclado_mouse: "OK",
                        estado_gabinete: "Atenção",
                        observacoes: "Leitor de código de barras arranhado com dificuldades de leitura. Gabinete amassado no suporte.",
                        imagem_url: imagemMarcadora
                    },
                    {
                        id: 4,
                        pdv_id: 5,
                        data: new Date("2026-05-18T16:00:00").toISOString(),
                        tecnico: "Carlos Silva",
                        status_impressora: "Atenção",
                        status_leitor: "Atenção",
                        status_teclado_mouse: "Atenção",
                        estado_gabinete: "Atenção",
                        observacoes: "Caixa crítico. Cabo USB do leitor quebrado, teclado sem algumas teclas e guilhotina trancando.",
                        imagem_url: imagemMarcadora
                    },
                    {
                        id: 5,
                        pdv_id: 8,
                        data: new Date("2026-05-20T11:20:00").toISOString(),
                        tecnico: "Ana Souza",
                        status_impressora: "OK",
                        status_leitor: "OK",
                        status_teclado_mouse: "Atenção",
                        estado_gabinete: "OK",
                        observacoes: "Mouse com scroll quebrado. Efetuado reparo temporário, mas requer troca.",
                        imagem_url: imagemMarcadora
                    }
                ];
                dadosAuditorias.forEach(auditoria => storeAuditorias.add(auditoria));

                // 5. Semear Logs Iniciais
                const dadosLogs = [
                    { data: new Date("2026-06-01T17:00:00").toISOString(), tipo: "INFO", descricao: "Inicializando a implantação da plataforma de auditoria Campelo." },
                    { data: new Date("2026-06-01T17:00:02").toISOString(), tipo: "INFO", descricao: "Criando estrutura física do projeto em C:\\Users\\gusta\\.gemini\\antigravity\\scratch\\campelo-auditorias\\" },
                    { data: new Date("2026-06-01T17:01:05").toISOString(), tipo: "INFO", descricao: "Arquivo database.sql gravado com sucesso." },
                    { data: new Date("2026-06-01T17:02:10").toISOString(), tipo: "INFO", descricao: "Estilos CSS premium configurados no arquivo styles.css." },
                    { data: new Date("2026-06-01T17:05:00").toISOString(), tipo: "INFO", descricao: "Lógica principal do sistema e wrappers do IndexedDB criados no arquivo app.js." },
                    { data: new Date("2026-06-01T17:07:30").toISOString(), tipo: "INFO", descricao: "Página principal index.html montada com layouts responsivos e abas." },
                    { data: new Date("2026-06-01T17:40:00").toISOString(), tipo: "INFO", descricao: "Adicionado suporte ao cadastro, edição e exclusão de Técnicos Responsáveis." },
                    { data: new Date("2026-06-01T17:50:00").toISOString(), tipo: "INFO", descricao: "Implementados painéis colapsáveis (formulários e listas de cadastro) para otimização visual." },
                    { data: new Date("2026-06-01T19:28:12").toISOString(), tipo: "INFO", descricao: "Sincronização e validação das regras em cascata (Cascade Delete) executada." },
                    { data: new Date("2026-06-01T19:35:00").toISOString(), tipo: "INFO", descricao: "Corrigida a renderização de relatórios PDF (resolvido problema de folha em branco usando wrapper com coordenadas 0,0)." },
                    { data: new Date("2026-06-01T19:40:00").toISOString(), tipo: "INFO", descricao: "Banco de dados local semeado com Lojas, PDVs, Técnicos e Auditorias de teste." }
                ];
                dadosLogs.forEach(log => storeLogs.add(log));

                transacao.oncomplete = () => {
                    console.log("Banco de dados semeado com sucesso!");
                    resolver();
                };
                transacao.onerror = (evento) => rejeitar(evento.target.error);
            } else {
                resolver();
            }
        };
        requisicaoContagem.onerror = (evento) => rejeitar(evento.target.error);
    });
}

// Criação rápida de imagem placeholder para semente
function criarImagemMarcadora() {
    const canvas = document.createElement("canvas");
    canvas.width = 190;
    canvas.height = 190;
    const ctx = canvas.getContext("2d");
    
    // Fundo verde escuro
    ctx.fillStyle = "#005C30";
    ctx.fillRect(0, 0, 190, 190);
    
    // Círculo amarelo no meio
    ctx.beginPath();
    ctx.arc(95, 95, 45, 0, 2 * Math.PI);
    ctx.fillStyle = "#F7D117";
    ctx.fill();
    
    // Detalhe verde dentro
    ctx.beginPath();
    ctx.arc(95, 95, 30, 0, 2 * Math.PI);
    ctx.fillStyle = "#005C30";
    ctx.fill();
    
    // Texto
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CAMPELO TI", 95, 160);
    
    return canvas.toDataURL("image/png");
}

// ==========================================
// 2. FUNÇÕES DE BANCO DE DADOS (Consultas)
// ==========================================
function obterTodos(nomeStore) {
    return new Promise((resolver, rejeitar) => {
        const transacao = bd.transaction([nomeStore], "readonly");
        const store = transacao.objectStore(nomeStore);
        const requisicao = store.getAll();
        requisicao.onsuccess = () => resolver(requisicao.result);
        requisicao.onerror = () => rejeitar(requisicao.error);
    });
}

function obterPdvsPorLoja(idLoja) {
    return new Promise((resolver, rejeitar) => {
        const transacao = bd.transaction(["pdvs"], "readonly");
        const store = transacao.objectStore("pdvs");
        const indice = store.index("loja_id");
        const requisicao = indice.getAll(IDBKeyRange.only(idLoja));
        requisicao.onsuccess = () => resolver(requisicao.result);
        requisicao.onerror = () => rejeitar(requisicao.error);
    });
}

function obterAuditoriasPorPdv(idPdv) {
    return new Promise((resolver, rejeitar) => {
        const transacao = bd.transaction(["auditorias"], "readonly");
        const store = transacao.objectStore("auditorias");
        const indice = store.index("pdv_id");
        const requisicao = indice.getAll(IDBKeyRange.only(idPdv));
        requisicao.onsuccess = () => {
            // Ordenar por data decrescente (mais recente primeiro)
            const resultado = requisicao.result.sort((a, b) => new Date(b.data) - new Date(a.data));
            resolver(resultado);
        };
        requisicao.onerror = () => rejeitar(requisicao.error);
    });
}

function salvarAuditoria(auditoria) {
    return new Promise((resolver, rejeitar) => {
        const transacao = bd.transaction(["auditorias"], "readwrite");
        const store = transacao.objectStore("auditorias");
        const requisicao = store.add(auditoria);
        requisicao.onsuccess = () => resolver(requisicao.result);
        requisicao.onerror = () => rejeitar(requisicao.error);
    });
}

function salvarLoja(loja) {
    return new Promise((resolver, rejeitar) => {
        const transacao = bd.transaction(["lojas"], "readwrite");
        const store = transacao.objectStore("lojas");
        const requisicao = store.add(loja);
        requisicao.onsuccess = () => resolver(requisicao.result);
        requisicao.onerror = () => rejeitar(requisicao.error);
    });
}

function salvarPdv(pdv) {
    return new Promise((resolver, rejeitar) => {
        const transacao = bd.transaction(["pdvs"], "readwrite");
        const store = transacao.objectStore("pdvs");
        
        // Verificação de caixa único por loja
        const requisicaoTodos = store.getAll();
        requisicaoTodos.onsuccess = () => {
            const pdvs = requisicaoTodos.result;
            const duplicado = pdvs.find(p => p.loja_id === pdv.loja_id && p.numero_caixa === pdv.numero_caixa);
            if (duplicado) {
                rejeitar(new Error("Já existe um caixa cadastrado com este número nesta unidade."));
            } else {
                const requisicaoAdicao = store.add(pdv);
                requisicaoAdicao.onsuccess = () => resolver(requisicaoAdicao.result);
                requisicaoAdicao.onerror = () => rejeitar(requisicaoAdicao.error);
            }
        };
        requisicaoTodos.onerror = () => rejeitar(requisicaoTodos.error);
    });
}

// ==========================================
// 3. CONTROLE DE INTERFACE (ABAS / EVENTOS)
// ==========================================
function configurarOuvintesEventos() {
    // Abas de navegação
    document.querySelectorAll(".botao-aba").forEach(botao => {
        botao.addEventListener("click", (evento) => {
            const abaAlvo = botao.getAttribute("data-target");
            alternarAba(abaAlvo);
        });
    });

    // Filtros de Loja no Dashboard
    document.getElementById("filtro-loja-painel").addEventListener("change", (evento) => {
        const filtro = evento.target.value;
        const idLoja = filtro === "todas" ? "todas" : parseInt(filtro);
        carregarDadosPainel(idLoja);
    });

    // Filtro de Loja no Formulário de Entrada
    document.getElementById("formulario-selecao-loja").addEventListener("change", (evento) => {
        const idLoja = parseInt(evento.target.value);
        if (idLoja) {
            atualizarDropdownPdvs(idLoja);
        } else {
            reiniciarDropdownPdvs();
        }
    });

    // PDV selecionado no Formulário (carrega especificações físicas pré-cadastradas)
    document.getElementById("formulario-selecao-pdv").addEventListener("change", async (evento) => {
        const idPdv = parseInt(evento.target.value);
        if (idPdv) {
            try {
                const pdvs = await obterTodos("pdvs");
                const pdv = pdvs.find(p => p.id === idPdv);
                if (pdv) {
                    document.getElementById("espec-so").value = pdv.so;
                    document.getElementById("espec-versao").value = pdv.versao;
                    document.getElementById("espec-ram").value = pdv.ram;
                    document.getElementById("espec-bios").value = pdv.bios;
                }
            } catch (erro) {
                console.error("Erro ao carregar especificações do PDV:", erro);
            }
        } else {
            limparCamposHardware();
        }
    });

    // Upload de Imagem & Redimensionamento Canvas
    const entradaArquivo = document.getElementById("upload-arquivo");
    const areaUpload = document.getElementById("area-upload");
    const conteinerPrevisualizacao = document.getElementById("conteiner-previsualizacao");
    const imagemPrevisualizacao = document.getElementById("imagem-previsualizacao");
    const botaoRemover = document.getElementById("remover-previsualizacao");

    areaUpload.addEventListener("click", () => entradaArquivo.click());

    entradaArquivo.addEventListener("change", (evento) => {
        const arquivo = evento.target.files[0];
        if (arquivo) {
            processarERedimensionarImagem(arquivo, (base64) => {
                base64PrevisualizacaoAtual = base64;
                imagemPrevisualizacao.src = base64;
                conteinerPrevisualizacao.style.display = "block";
                areaUpload.style.display = "none";
            });
        }
    });

    botaoRemover.addEventListener("click", (evento) => {
        evento.stopPropagation();
        entradaArquivo.value = "";
        base64PrevisualizacaoAtual = "";
        imagemPrevisualizacao.src = "";
        conteinerPrevisualizacao.style.display = "none";
        areaUpload.style.display = "flex";
    });

    // Seletores Rápidos de Status (OK/Atenção)
    document.querySelectorAll(".botao-status").forEach(botao => {
        botao.addEventListener("click", (evento) => {
            const pai = botao.parentElement;
            pai.querySelectorAll(".botao-status").forEach(b => b.classList.remove("ativo"));
            botao.classList.add("ativo");
        });
    });

    // Submissão do Formulário de Auditoria
    document.getElementById("formulario-auditoria").addEventListener("submit", processarSubmissaoFormulario);

    // Submissão de Formulários de Cadastro/Edição
    document.getElementById("formulario-cadastro-loja").addEventListener("submit", processarCadastroLoja);
    document.getElementById("formulario-cadastro-pdv").addEventListener("submit", processarCadastroPdv);
    document.getElementById("formulario-cadastro-tecnico").addEventListener("submit", processarCadastroTecnico);

    // Cancelamento de Edições
    document.getElementById("botao-cancelar-edicao-loja").addEventListener("click", cancelarEdicaoLoja);
    document.getElementById("botao-cancelar-edicao-pdv").addEventListener("click", cancelarEdicaoPdv);
    document.getElementById("botao-cancelar-edicao-tecnico").addEventListener("click", cancelarEdicaoTecnico);

    // Evento para atualizar lista de PDVs cadastrados ao selecionar loja no formulário de PDVs
    document.getElementById("cadastro-pdv-selecao-loja").addEventListener("change", (evento) => {
        const idLoja = parseInt(evento.target.value);
        renderizarListaPdvsCadastro(idLoja);
    });

    // Fechar Modais
    document.getElementById("modal-fechar").addEventListener("click", fecharModal);
    document.getElementById("sobreposicao-modal").addEventListener("click", (evento) => {
        if (evento.target.id === "sobreposicao-modal") fecharModal();
    });
}

function alternarAba(idAba) {
    document.querySelectorAll(".botao-aba").forEach(botao => {
        botao.classList.toggle("ativo", botao.getAttribute("data-target") === idAba);
    });

    document.querySelectorAll(".secao-aplicacao").forEach(secao => {
        secao.classList.toggle("ativa", secao.id === idAba);
    });

    // Ações de carregamento dinâmico ao alternar abas
    if (idAba === "aba-painel") {
        const filtroAtual = document.getElementById("filtro-loja-painel").value;
        const idLoja = filtroAtual === "todas" ? "todas" : parseInt(filtroAtual);
        carregarDadosPainel(idLoja);
    } else if (idAba === "aba-nova-auditoria") {
        reiniciarFormularioAuditoria();
        carregarDropdownTecnicos();
    } else if (idAba === "aba-todos-pdvs") {
        carregarVisualizacaoListaPdvs();
    } else if (idAba === "aba-cadastros") {
        cancelarEdicaoLoja();
        cancelarEdicaoPdv();
        cancelarEdicaoTecnico();
        atualizarDropdownLojaCadastro();
        renderizarListaLojasCadastro();
        renderizarListaTecnicosCadastro();
    }
}

// ==========================================
// 4. LÓGICA DO FORMULÁRIO E PROCESSAMENTO DE IMAGEM
// ==========================================
function atualizarDropdownPdvs(idLoja) {
    obterPdvsPorLoja(idLoja).then(pdvs => {
        const seletorPdv = document.getElementById("formulario-selecao-pdv");
        seletorPdv.innerHTML = `<option value="">Selecione o Caixa...</option>`;
        pdvs.forEach(p => {
            seletorPdv.innerHTML += `<option value="${p.id}">Caixa ${p.numero_caixa}</option>`;
        });
        seletorPdv.disabled = false;
        limparCamposHardware();
    });
}

function reiniciarDropdownPdvs() {
    const seletorPdv = document.getElementById("formulario-selecao-pdv");
    seletorPdv.innerHTML = `<option value="">Selecione a Loja Primeiro...</option>`;
    seletorPdv.disabled = true;
    limparCamposHardware();
}

function limparCamposHardware() {
    document.getElementById("espec-so").value = "";
    document.getElementById("espec-versao").value = "";
    document.getElementById("espec-ram").value = "";
    document.getElementById("espec-bios").value = "";
}

function reiniciarFormularioAuditoria() {
    document.getElementById("formulario-auditoria").reset();
    reiniciarDropdownPdvs();
    
    // Padrão OK ativo
    document.querySelectorAll(".card-status").forEach(card => {
        card.querySelectorAll(".botao-status").forEach(b => b.classList.remove("ativo"));
        card.querySelector(".botao-ok").classList.add("ativo");
    });

    // Reset imagem
    document.getElementById("upload-arquivo").value = "";
    base64PrevisualizacaoAtual = "";
    document.getElementById("imagem-previsualizacao").src = "";
    document.getElementById("conteiner-previsualizacao").style.display = "none";
    document.getElementById("area-upload").style.display = "flex";
}

// Redimensionamento de Imagem para 190x190px via Canvas
function processarERedimensionarImagem(arquivo, retorno) {
    const leitor = new FileReader();
    leitor.onload = (eventoLeitura) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 190;
            canvas.height = 190;
            const ctx = canvas.getContext("2d");

            // Corte centralizado da foto (cover)
            const tamanhoMinimo = Math.min(img.width, img.height);
            const sx = (img.width - tamanhoMinimo) / 2;
            const sy = (img.height - tamanhoMinimo) / 2;

            ctx.drawImage(img, sx, sy, tamanhoMinimo, tamanhoMinimo, 0, 0, 190, 190);
            
            const base64Redimensionada = canvas.toDataURL("image/jpeg", 0.85);
            retorno(base64Redimensionada);
        };
        img.src = eventoLeitura.target.result;
    };
    leitor.readAsDataURL(arquivo);
}

// Submissão do Formulário de Auditoria
async function processarSubmissaoFormulario(evento) {
    evento.preventDefault();

    const idLoja = parseInt(document.getElementById("formulario-selecao-loja").value);
    const idPdv = parseInt(document.getElementById("formulario-selecao-pdv").value);
    const seletorTecnico = document.getElementById("formulario-tecnico");
    const tecnico = seletorTecnico.value ? seletorTecnico.options[seletorTecnico.selectedIndex].text : "";
    const observacoes = document.getElementById("formulario-observacoes").value.trim();
    
    if (!idLoja || !idPdv || !tecnico) {
        exibirNotificacao("Por favor, preencha todos os campos obrigatórios.", "erro");
        return;
    }

    const so = document.getElementById("espec-so").value.trim();
    const versao = document.getElementById("espec-versao").value.trim();
    const ram = parseInt(document.getElementById("espec-ram").value);
    const bios = document.getElementById("espec-bios").value;

    if (!so || !versao || !ram || !bios) {
        exibirNotificacao("Especificações de hardware incompletas.", "erro");
        return;
    }

    const obterStatus = (idCard) => {
        const botaoAtivo = document.querySelector(`#${idCard} .botao-status.ativo`);
        return botaoAtivo ? botaoAtivo.innerText : "OK";
    };

    const status_impressora = obterStatus("card-status-impressora");
    const status_leitor = obterStatus("card-status-leitor");
    const status_teclado_mouse = obterStatus("card-status-teclado");
    const estado_gabinete = obterStatus("card-status-gabinete");

    try {
        // 1. Atualizar especificações do PDV no IndexedDB se mudou
        const transacao = bd.transaction(["pdvs"], "readwrite");
        const storePdvs = transacao.objectStore("pdvs");
        const objetoPdv = await new Promise((res, rej) => {
            const req = storePdvs.get(idPdv);
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
        });

        if (objetoPdv) {
            objetoPdv.so = so;
            objetoPdv.versao = versao;
            objetoPdv.ram = ram;
            objetoPdv.bios = bios;
            await new Promise((res, rej) => {
                const req = storePdvs.put(objetoPdv);
                req.onsuccess = () => res();
                req.onerror = () => rej(req.error);
            });
        }

        // 2. Gravar auditoria
        const novaAuditoria = {
            pdv_id: idPdv,
            data: new Date().toISOString(),
            tecnico: tecnico,
            status_impressora,
            status_leitor,
            status_teclado_mouse,
            estado_gabinete,
            observacoes,
            imagem_url: base64PrevisualizacaoAtual || criarImagemMarcadora()
        };

        await salvarAuditoria(novaAuditoria);
        registrarLog("INFO", `Nova auditoria registrada para Caixa ${objetoPdv ? objetoPdv.numero_caixa : idPdv} (Loja ID ${objetoPdv ? objetoPdv.loja_id : '?'}) pelo técnico "${tecnico}".`);

        exibirNotificacao("Auditoria salva com sucesso!", "sucesso");
        reiniciarFormularioAuditoria();
        alternarAba("aba-painel");
    } catch (erro) {
        console.error("Erro ao salvar auditoria:", erro);
        exibirNotificacao("Erro crítico ao salvar auditoria no IndexedDB.", "erro");
    }
}

// ==========================================
// 5. CARREGAMENTO DOS FILTROS E LOJAS
// ==========================================
async function carregarFiltrosLojas() {
    try {
        const lojas = await obterTodos("lojas");
        
        // Filtro do painel
        const filtroPainel = document.getElementById("filtro-loja-painel");
        filtroPainel.innerHTML = `<option value="todas">Todas as Unidades</option>`;
        lojas.forEach(l => {
            filtroPainel.innerHTML += `<option value="${l.id}">${l.nome}</option>`;
        });

        // Dropdown do formulário de inspeção
        const seletorForm = document.getElementById("formulario-selecao-loja");
        seletorForm.innerHTML = `<option value="">Selecione a Loja...</option>`;
        lojas.forEach(l => {
            seletorForm.innerHTML += `<option value="${l.id}">${l.nome}</option>`;
        });

        // Sincronizar o dropdown de cadastro de PDVs
        atualizarDropdownLojaCadastro();
    } catch (erro) {
        console.error("Erro ao carregar lojas para filtros:", erro);
    }
}

// ==========================================
// 6. DASHBOARD E GRÁFICOS (Chart.js)
// ==========================================
async function carregarDadosPainel(idLojaFiltro = "todas") {
    try {
        const lojas = await obterTodos("lojas");
        const pdvs = await obterTodos("pdvs");
        const auditorias = await obterTodos("auditorias");

        // Filtrar PDVs
        const pdvsFiltrados = pdvs.filter(p => idLojaFiltro === "todas" || p.loja_id === idLojaFiltro);
        const idsPdvsFiltrados = new Set(pdvsFiltrados.map(p => p.id));

        // Mapeamento de lojas para indexação
        const mapaLojas = {};
        lojas.forEach(l => mapaLojas[l.id] = l);

        // Encontrar a última auditoria de cada caixa filtrado
        const mapaUltimaAuditoria = {};
        auditorias.forEach(a => {
            if (idsPdvsFiltrados.has(a.pdv_id)) {
                const existente = mapaUltimaAuditoria[a.pdv_id];
                if (!existente || new Date(a.data) > new Date(existente.data)) {
                    mapaUltimaAuditoria[a.pdv_id] = a;
                }
            }
        });

        // 1. Estatísticas
        const totalPdvs = pdvsFiltrados.length;
        const listaUpgradeRam = pdvsFiltrados.filter(p => p.ram < 8);
        const percentualUpgradeRam = totalPdvs > 0 ? Math.round((listaUpgradeRam.length / totalPdvs) * 100) : 0;

        const contagemUefi = pdvsFiltrados.filter(p => p.bios === "UEFI").length;
        const contagemLegacy = pdvsFiltrados.filter(p => p.bios === "Legacy").length;

        let alertasImpressora = 0;
        let alertasLeitor = 0;
        let alertasTeclado = 0;
        let alertasGabinete = 0;
        let totalCaixasComAlerta = 0;

        Object.values(mapaUltimaAuditoria).forEach(a => {
            let temAlerta = false;
            if (a.status_impressora === "Atenção") { alertasImpressora++; temAlerta = true; }
            if (a.status_leitor === "Atenção") { alertasLeitor++; temAlerta = true; }
            if (a.status_teclado_mouse === "Atenção") { alertasTeclado++; temAlerta = true; }
            if (a.estado_gabinete === "Atenção") { alertasGabinete++; temAlerta = true; }
            if (temAlerta) totalCaixasComAlerta++;
        });

        // Atualizar números no HTML
        document.getElementById("metrica-total-pdvs").innerText = totalPdvs;
        document.getElementById("metrica-upgrade-ram").innerText = `${percentualUpgradeRam}%`;
        document.getElementById("metrica-upgrade-sub").innerText = `${listaUpgradeRam.length} de ${totalPdvs} PDVs (< 8GB)`;
        
        const elementoAlerta = document.getElementById("metrica-defeitos-ativos");
        elementoAlerta.innerText = totalCaixasComAlerta;
        
        if (totalCaixasComAlerta > 0) {
            elementoAlerta.parentElement.parentElement.querySelector(".icone-metrica").classList.add("alerta");
        } else {
            elementoAlerta.parentElement.parentElement.querySelector(".icone-metrica").classList.remove("alerta");
        }

        // 2. Gráficos
        renderizarGraficoBios(contagemUefi, contagemLegacy);
        renderizarGraficoPerifericos(alertasImpressora, alertasLeitor, alertasTeclado, alertasGabinete);

        // 3. Grade de Caixas
        renderizarGradeCardsPdvs(pdvsFiltrados, mapaLojas, mapaUltimaAuditoria);

    } catch (erro) {
        console.error("Erro ao carregar dados do dashboard:", erro);
    }
}

function renderizarGraficoBios(uefi, legacy) {
    const ctx = document.getElementById("grafico-bios").getContext("2d");
    
    if (graficoBios) {
        graficoBios.destroy();
    }

    if (uefi === 0 && legacy === 0) {
        ctx.clearRect(0, 0, 200, 200);
        return;
    }

    graficoBios = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['UEFI', 'Legacy'],
            datasets: [{
                data: [uefi, legacy],
                backgroundColor: ['#008746', '#F7D117'],
                borderColor: '#151e18',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#a0b2a6', font: { family: 'Outfit', size: 12 } }
                }
            },
            cutout: '65%'
        }
    });
}

function renderizarGraficoPerifericos(imp, lei, tec, gab) {
    const ctx = document.getElementById("grafico-perifericos").getContext("2d");

    if (graficoPerifericos) {
        graficoPerifericos.destroy();
    }

    graficoPerifericos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Impressora', 'Leitor', 'Teclado/Mouse', 'Gabinete'],
            datasets: [{
                label: 'Ocorrências de Defeito (Atenção)',
                data: [imp, lei, tec, gab],
                backgroundColor: 'rgba(231, 111, 81, 0.85)',
                borderColor: '#e76f51',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#a0b2a6', stepSize: 1, font: { family: 'Outfit' } },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#a0b2a6', font: { family: 'Outfit', size: 11 } },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderizarGradeCardsPdvs(pdvs, mapaLojas, mapaUltimaAuditoria) {
    const container = document.getElementById("conteiner-cards-pdvs");
    container.innerHTML = "";

    if (pdvs.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--texto-secundario); padding: 40px;">Nenhum caixa cadastrado nesta unidade.</div>`;
        return;
    }

    pdvs.forEach(p => {
        const nomeLoja = mapaLojas[p.loja_id] ? mapaLojas[p.loja_id].nome : "Loja Desconhecida";
        const auditoria = mapaUltimaAuditoria[p.id];
        
        let classeStatus = "ok";
        let textoStatus = "OK (Sem Alertas)";
        let possuiAlerta = false;

        if (auditoria) {
            if (auditoria.status_impressora === "Atenção" || 
                auditoria.status_leitor === "Atenção" || 
                auditoria.status_teclado_mouse === "Atenção" || 
                auditoria.estado_gabinete === "Atenção") {
                classeStatus = "alerta";
                textoStatus = "Atenção";
                possuiAlerta = true;
            }
        } else {
            classeStatus = "alerta";
            textoStatus = "Sem Inspeções";
            possuiAlerta = true;
        }

        const card = document.createElement("div");
        card.className = `card-pdv ${possuiAlerta ? 'alerta' : ''}`;
        card.setAttribute("onclick", `abrirModalDetalhesPdv(${p.id})`);

        card.innerHTML = `
            <div>
                <div class="cabecalho-card-pdv">
                    <div>
                        <div class="titulo-card-pdv">Caixa ${p.numero_caixa}</div>
                        <div class="loja-card-pdv">${nomeLoja}</div>
                    </div>
                    <span class="etiqueta-pdv ${classeStatus}">${textoStatus}</span>
                </div>
                <div class="lista-especs-pdv">
                    <div class="item-espec"><span class="rotulo-espec">S.O.</span><span class="valor-espec">${p.so}</span></div>
                    <div class="item-espec"><span class="rotulo-espec">RAM</span><span class="valor-espec ${p.ram < 8 ? 'text-warn' : ''}">${p.ram} GB</span></div>
                    <div class="item-espec"><span class="rotulo-espec">BIOS</span><span class="valor-espec">${p.bios}</span></div>
                </div>
            </div>
            <div class="perifericos-pdv">
                <div class="indicador-periferico">
                    <span class="ponto-status-periferico ${auditoria?.status_impressora === 'Atenção' ? 'alerta' : ''}"></span>
                    Imp
                </div>
                <div class="indicador-periferico">
                    <span class="ponto-status-periferico ${auditoria?.status_leitor === 'Atenção' ? 'alerta' : ''}"></span>
                    Leitor
                </div>
                <div class="indicador-periferico">
                    <span class="ponto-status-periferico ${auditoria?.status_teclado_mouse === 'Atenção' ? 'alerta' : ''}"></span>
                    Tecl/M
                </div>
                <div class="indicador-periferico">
                    <span class="ponto-status-periferico ${auditoria?.estado_gabinete === 'Atenção' ? 'alerta' : ''}"></span>
                    Gab
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

// Lista geral de todos os PDVs
async function carregarVisualizacaoListaPdvs() {
    try {
        const pdvs = await obterTodos("pdvs");
        const lojas = await obterTodos("lojas");
        const auditorias = await obterTodos("auditorias");
        
        const mapaLojas = {};
        lojas.forEach(l => mapaLojas[l.id] = l);

        const mapaUltimaAuditoria = {};
        auditorias.forEach(a => {
            const existente = mapaUltimaAuditoria[a.pdv_id];
            if (!existente || new Date(a.data) > new Date(existente.data)) {
                mapaUltimaAuditoria[a.pdv_id] = a;
            }
        });

        const container = document.getElementById("conteiner-lista-todos-pdvs");
        container.innerHTML = "";

        if (pdvs.length === 0) {
            container.innerHTML = `<p style="color: var(--texto-secundario);">Nenhum PDV cadastrado no sistema.</p>`;
            return;
        }

        pdvs.forEach(p => {
            const nomeLoja = mapaLojas[p.loja_id] ? mapaLojas[p.loja_id].nome : "Loja Desconhecida";
            const auditoria = mapaUltimaAuditoria[p.id];
            let statusTexto = "OK";
            let possuiAlerta = false;

            if (auditoria) {
                if (auditoria.status_impressora === "Atenção" || 
                    auditoria.status_leitor === "Atenção" || 
                    auditoria.status_teclado_mouse === "Atenção" || 
                    auditoria.estado_gabinete === "Atenção") {
                    statusTexto = "Atenção";
                    possuiAlerta = true;
                }
            } else {
                statusTexto = "Sem Auditoria";
                possuiAlerta = true;
            }

            const card = document.createElement("div");
            card.className = `card-pdv ${possuiAlerta ? 'alerta' : ''}`;
            card.setAttribute("onclick", `abrirModalDetalhesPdv(${p.id})`);
            card.innerHTML = `
                <div>
                    <div class="cabecalho-card-pdv">
                        <div>
                            <div class="titulo-card-pdv">Caixa ${p.numero_caixa}</div>
                            <div class="loja-card-pdv">${nomeLoja}</div>
                        </div>
                        <span class="etiqueta-pdv ${possuiAlerta ? 'alerta' : 'ok'}">${statusTexto}</span>
                    </div>
                    <div class="lista-especs-pdv">
                        <div class="item-espec"><span class="rotulo-espec">Hardware</span><span class="valor-espec">${p.ram}GB RAM / ${p.bios}</span></div>
                        <div class="item-espec"><span class="rotulo-espec">S.O.</span><span class="valor-espec">${p.so} (${p.versao})</span></div>
                        <div class="item-espec"><span class="rotulo-espec">Última Inspeção</span><span class="valor-espec">${auditoria ? new Date(auditoria.data).toLocaleDateString("pt-BR") : 'Nenhuma'}</span></div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (erro) {
        console.error("Erro ao listar todos os PDVs:", erro);
    }
}

// ==========================================
// 7. DETALHES DO PDV E HISTÓRICO DE AUDITORIA (MODAL)
// ==========================================
async function abrirModalDetalhesPdv(idPdv) {
    try {
        const pdvs = await obterTodos("pdvs");
        const lojas = await obterTodos("lojas");
        const auditorias = await obterAuditoriasPorPdv(idPdv);

        const pdv = pdvs.find(p => p.id === idPdv);
        const loja = lojas.find(l => l.id === pdv.loja_id);

        if (!pdv || !loja) return;

        // Cabeçalho do modal
        document.getElementById("modal-pdv-titulo").innerText = `Caixa ${pdv.numero_caixa}`;
        document.getElementById("modal-loja-nome").innerText = loja.nome;

        // Hardware do modal
        document.getElementById("modal-espec-so").innerText = pdv.so;
        document.getElementById("modal-espec-versao").innerText = pdv.versao;
        document.getElementById("modal-espec-ram").innerText = `${pdv.ram} GB`;
        document.getElementById("modal-espec-bios").innerText = pdv.bios;

        if (pdv.ram < 8) {
            document.getElementById("modal-espec-ram").className = "valor-espec text-warn";
        } else {
            document.getElementById("modal-espec-ram").className = "valor-espec";
        }

        // Histórico
        const conteinerHistorico = document.getElementById("modal-historico-auditoria");
        conteinerHistorico.innerHTML = "";

        if (auditorias.length === 0) {
            conteinerHistorico.innerHTML = `<p style="color: var(--texto-secundario); text-align: center; padding: 20px;">Nenhuma auditoria realizada neste caixa.</p>`;
        } else {
            auditorias.forEach(a => {
                const stringData = new Date(a.data).toLocaleString("pt-BR");
                const itemHistorico = document.createElement("div");
                itemHistorico.className = "item-historico-auditoria";
                
                itemHistorico.innerHTML = `
                    <div class="meta-cabecalho-auditoria">
                        <strong>Técnico: ${a.tecnico}</strong>
                        <span>${stringData}</span>
                    </div>
                    <table class="pdf-tabela" style="color: #fff; width: 100%; border: 1px solid rgba(255, 255, 255, 0.05); margin-bottom: 12px;">
                        <thead>
                            <tr style="background: rgba(0, 0, 0, 0.4);">
                                <th style="color: #fff; font-size: 11px; padding: 6px;">Impressora</th>
                                <th style="color: #fff; font-size: 11px; padding: 6px;">Leitor</th>
                                <th style="color: #fff; font-size: 11px; padding: 6px;">Teclado/Mouse</th>
                                <th style="color: #fff; font-size: 11px; padding: 6px;">Gabinete</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="${a.status_impressora === 'Atenção' ? 'text-warn' : 'text-ok'}" style="font-size: 12px; padding: 6px; font-weight: bold;">${a.status_impressora}</td>
                                <td class="${a.status_leitor === 'Atenção' ? 'text-warn' : 'text-ok'}" style="font-size: 12px; padding: 6px; font-weight: bold;">${a.status_leitor}</td>
                                <td class="${a.status_teclado_mouse === 'Atenção' ? 'text-warn' : 'text-ok'}" style="font-size: 12px; padding: 6px; font-weight: bold;">${a.status_teclado_mouse}</td>
                                <td class="${a.estado_gabinete === 'Atenção' ? 'text-warn' : 'text-ok'}" style="font-size: 12px; padding: 6px; font-weight: bold;">${a.estado_gabinete}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="grade-auditoria-190">
                        <div>
                            <img src="${a.imagem_url}" class="imagem-190" alt="Gabinete Caixa ${pdv.numero_caixa}" />
                        </div>
                        <div>
                            <p style="font-size: 13px; color: var(--texto-secundario); font-weight: 600; text-transform: uppercase;">Observações:</p>
                            <p style="font-size: 14px; margin-top: 4px; color: var(--texto-principal); font-style: italic;">"${a.observacoes || 'Sem observações registradas.'}"</p>
                            <button class="botao-destaque" style="margin-top: 20px; font-size: 12px; padding: 6px 12px;" onclick="exportarPdfAuditoria(${pdv.id}, ${a.id})">
                                <i class="fas fa-file-pdf"></i> Exportar PDF
                            </button>
                        </div>
                    </div>
                `;
                conteinerHistorico.appendChild(itemHistorico);
            });
        }

        document.getElementById("sobreposicao-modal").style.display = "flex";

    } catch (erro) {
        console.error("Erro ao carregar detalhes do PDV:", erro);
    }
}

function fecharModal() {
    document.getElementById("sobreposicao-modal").style.display = "none";
}

// ==========================================
// 8. RELATÓRIO PDF (html2pdf.js)
// ==========================================
async function exportarPdfAuditoria(idPdv, idAuditoria) {
    try {
        const pdvs = await obterTodos("pdvs");
        const lojas = await obterTodos("lojas");
        const auditorias = await obterTodos("auditorias");

        const pdv = pdvs.find(p => p.id === idPdv);
        const loja = lojas.find(l => l.id === pdv.loja_id);
        const auditoria = auditorias.find(a => a.id === idAuditoria);

        if (!pdv || !loja || !auditoria) return;

        // Alimentar o Template de PDF
        document.getElementById("pdf-nome-loja").innerText = loja.nome;
        document.getElementById("pdf-localizacao-loja").innerText = loja.localizacao;
        document.getElementById("pdf-meta-caixa").innerText = `Caixa ${pdv.numero_caixa}`;
        document.getElementById("pdf-meta-data").innerText = new Date(auditoria.data).toLocaleString("pt-BR");
        document.getElementById("pdf-meta-tecnico").innerText = auditoria.tecnico;

        // Hardware
        document.getElementById("pdf-computador-so").innerText = pdv.so;
        document.getElementById("pdf-computador-versao").innerText = pdv.versao;
        document.getElementById("pdf-computador-ram").innerText = `${pdv.ram} GB`;
        document.getElementById("pdf-computador-bios").innerText = pdv.bios;

        // Status Periféricos
        const definirLinhaStatusPdf = (idTd, status) => {
            const td = document.getElementById(idTd);
            td.innerText = status;
            td.className = status === "OK" ? "ok" : "atencao";
        };
        definirLinhaStatusPdf("pdf-status-impressora", auditoria.status_impressora);
        definirLinhaStatusPdf("pdf-status-leitor", auditoria.status_leitor);
        definirLinhaStatusPdf("pdf-status-teclado", auditoria.status_teclado_mouse);
        definirLinhaStatusPdf("pdf-status-gabinete", auditoria.estado_gabinete);

        // Observações
        document.getElementById("pdf-observacoes").innerText = auditoria.observacoes || "Sem observações adicionais.";

        // Foto 190x190px
        document.getElementById("pdf-renderizacao-imagem").src = auditoria.imagem_url;

        const elemento = document.getElementById("template-pdf");
        
        const opcoes = {
            margin: 10,
            filename: `Relatorio_Auditoria_TI_Caixa_${pdv.numero_caixa}_${loja.nome.replace(/\s+/g, "_")}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        exibirNotificacao("Gerando PDF...", "sucesso");
        html2pdf().set(opcoes).from(elemento).save()
            .then(() => {
                exibirNotificacao("PDF exportado com sucesso!", "sucesso");
                registrarLog("INFO", `Relatório PDF individual exportado para Caixa ${pdv.numero_caixa} (${loja.nome}) da auditoria de ${new Date(auditoria.data).toLocaleDateString("pt-BR")}.`);
            })
            .catch(erro => {
                console.error("Erro ao gerar PDF:", erro);
                exibirNotificacao("Erro ao exportar PDF.", "erro");
            });
    } catch (erro) {
        console.error("Erro na exportação do PDF:", erro);
        exibirNotificacao("Erro ao exportar PDF.", "erro");
    }
}

async function gerarRelatorioGeralPdf() {
    try {
        const filtroLoja = document.getElementById("filtro-loja-painel").value;
        const seletorLoja = document.getElementById("filtro-loja-painel");
        const nomeLojaLimpo = filtroLoja === "todas" ? "Rede_Geral" : seletorLoja.options[seletorLoja.selectedIndex].text.replace(/\s+/g, "_");

        const dataAtual = new Date();
        const ano = dataAtual.getFullYear();
        const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
        const dia = String(dataAtual.getDate()).padStart(2, '0');
        const stringDataArquivo = `${ano}-${mes}-${dia}`;

        const lojas = await obterTodos("lojas");
        const pdvs = await obterTodos("pdvs");
        const auditorias = await obterTodos("auditorias");

        const pdvsFiltrados = filtroLoja === "todas"
            ? pdvs
            : pdvs.filter(p => p.loja_id === Number(filtroLoja));

        const pdvIdsFiltrados = new Set(pdvsFiltrados.map(p => p.id));
        const auditoriasFiltradas = auditorias
            .filter(a => pdvIdsFiltrados.has(a.pdv_id))
            .map(auditoria => {
                const pdv = pdvs.find(p => p.id === auditoria.pdv_id);
                const loja = pdv ? lojas.find(l => l.id === pdv.loja_id) : null;
                return { auditoria, pdv, loja };
            })
            .filter(item => item.pdv && item.loja)
            .sort((a, b) => new Date(b.auditoria.data) - new Date(a.auditoria.data));

        const totalPdvs = pdvsFiltrados.length;
        const totalAuditorias = auditoriasFiltradas.length;
        const totalAlertas = auditoriasFiltradas.reduce((contador, item) => {
            const semAlerta = item.auditoria.status_impressora === "OK"
                && item.auditoria.status_leitor === "OK"
                && item.auditoria.status_teclado_mouse === "OK"
                && item.auditoria.estado_gabinete === "OK";
            return contador + (semAlerta ? 0 : 1);
        }, 0);

        document.getElementById("pdf-geral-topo-filial").innerText = filtroLoja === "todas"
            ? "Todas as Lojas"
            : seletorLoja.options[seletorLoja.selectedIndex].text;
        document.getElementById("pdf-geral-topo-data").innerText = dataAtual.toLocaleString("pt-BR");
        document.getElementById("pdf-geral-total-pdvs").innerText = totalPdvs;
        document.getElementById("pdf-geral-total-auditorias").innerText = totalAuditorias;
        document.getElementById("pdf-geral-alertas").innerText = totalAlertas;

        const corpoTabela = document.getElementById("pdf-geral-tabela-corpo");
        if (auditoriasFiltradas.length === 0) {
            corpoTabela.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding: 14px;">Nenhuma auditoria encontrada para o filtro selecionado.</td>
                </tr>
            `;
        } else {
            corpoTabela.innerHTML = auditoriasFiltradas.map((item, index) => {
                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.loja.nome}</td>
                        <td>Caixa ${item.pdv.numero_caixa}</td>
                        <td>${new Date(item.auditoria.data).toLocaleString("pt-BR")}</td>
                        <td>${item.auditoria.tecnico}</td>
                        <td>${item.auditoria.status_impressora}</td>
                        <td>${item.auditoria.status_leitor}</td>
                        <td>${item.auditoria.status_teclado_mouse}</td>
                        <td>${item.auditoria.estado_gabinete}</td>
                    </tr>
                `;
            }).join("");
        }

        const wrapper = document.querySelector(".conteiner-pdf-oculto");
        const oldWrapperStyles = wrapper ? {
            visibility: wrapper.style.visibility,
            opacity: wrapper.style.opacity,
            left: wrapper.style.left,
            top: wrapper.style.top
        } : null;

        if (wrapper) {
            wrapper.style.visibility = "visible";
            wrapper.style.opacity = "1";
            wrapper.style.left = "-9999px";
            wrapper.style.top = "-9999px";
        }

        const elemento = document.getElementById("template-pdf-geral");
        if (!elemento) {
            exibirNotificacao("Erro: Template de relatório não encontrado.", "erro");
            return;
        }

        await new Promise(resolve => requestAnimationFrame(resolve));

        const opcoes = {
            margin: 10,
            filename: `Relatorio_Geral_Campelo_${nomeLojaLimpo}_${stringDataArquivo}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                scrollX: 0,
                scrollY: 0,
                backgroundColor: "#ffffff",
                logging: false,
                windowWidth: document.documentElement.scrollWidth,
                windowHeight: document.documentElement.scrollHeight
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
            pagebreak: { mode: ['css', 'legacy'] }
        };

        exibirNotificacao("Gerando Relatório Geral...", "sucesso");
        try {
            await html2pdf().set(opcoes).from(elemento).save();
            exibirNotificacao("Relatório Geral exportado com sucesso!", "sucesso");
            registrarLog("INFO", `Relatório Geral exportado para ${nomeLojaLimpo}.`);
        } catch (erro) {
            console.error("Erro ao gerar Relatório Geral PDF:", erro);
            exibirNotificacao("Erro ao exportar Relatório Geral.", "erro");
        } finally {
            if (wrapper && oldWrapperStyles) {
                wrapper.style.visibility = oldWrapperStyles.visibility;
                wrapper.style.opacity = oldWrapperStyles.opacity;
                wrapper.style.left = oldWrapperStyles.left;
                wrapper.style.top = oldWrapperStyles.top;
            }
        }
    } catch (erro) {
        console.error("Erro na geração do relatório geral:", erro);
        exibirNotificacao("Erro ao gerar relatório geral.", "erro");
    }
}

// ==========================================
// 9. CADASTROS DE LOJAS E PDVS
// ==========================================
async function processarCadastroLoja(evento) {
    evento.preventDefault();
    const nome = document.getElementById("cadastro-loja-nome").value.trim();
    const localizacao = document.getElementById("cadastro-loja-localizacao").value.trim();

    if (!nome || !localizacao) {
        exibirNotificacao("Por favor, preencha todos os campos.", "erro");
        return;
    }

    try {
        const lojas = await obterTodos("lojas");
        // Validação ignorando a própria loja atual na edição
        const duplicado = lojas.find(l => l.id !== idLojaEditando && l.nome.toLowerCase() === nome.toLowerCase());
        
        if (duplicado) {
            exibirNotificacao("Já existe uma unidade com este nome.", "erro");
            return;
        }

        if (idLojaEditando) {
            // Edição
            const transacao = bd.transaction(["lojas"], "readwrite");
            const store = transacao.objectStore("lojas");
            await new Promise((res, rej) => {
                const req = store.put({ id: idLojaEditando, nome, localizacao });
                req.onsuccess = () => res();
                req.onerror = () => rej(req.error);
            });
            exibirNotificacao("Loja atualizada com sucesso!", "sucesso");
            registrarLog("INFO", `Loja "${nome}" (ID ${idLojaEditando}) atualizada com sucesso.`);
            cancelarEdicaoLoja();
        } else {
            // Criação
            await salvarLoja({ nome, localizacao });
            registrarLog("INFO", `Nova loja "${nome}" cadastrada com sucesso.`);
            exibirNotificacao("Nova loja cadastrada com sucesso!", "sucesso");
            document.getElementById("formulario-cadastro-loja").reset();
        }
        
        await carregarFiltrosLojas();
        await atualizarDropdownLojaCadastro();
        await renderizarListaLojasCadastro();
        
        alternarAba("aba-painel");
    } catch (erro) {
        console.error("Erro ao processar loja:", erro);
        exibirNotificacao("Erro ao processar loja.", "erro");
    }
}

async function processarCadastroPdv(evento) {
    evento.preventDefault();
    const idLojaSelecionada = document.getElementById("cadastro-pdv-selecao-loja").value;
    const numero_caixa = parseInt(document.getElementById("cadastro-pdv-numero").value);
    const ram = parseInt(document.getElementById("cadastro-pdv-ram").value);
    const so = document.getElementById("cadastro-pdv-so").value.trim();
    const versao = document.getElementById("cadastro-pdv-versao").value.trim();
    const bios = document.getElementById("cadastro-pdv-bios").value;

    if (!idLojaSelecionada || !numero_caixa || !ram || !so || !versao || !bios) {
        exibirNotificacao("Por favor, preencha todos os campos.", "erro");
        return;
    }

    const loja_id = parseInt(idLojaSelecionada);

    try {
        const dadosPdv = { loja_id, numero_caixa, so, versao, ram, bios };

        if (idPdvEditando) {
            // Edição
            const transacao = bd.transaction(["pdvs"], "readwrite");
            const store = transacao.objectStore("pdvs");
            
            const todosPdvs = await obterTodos("pdvs");
            const duplicado = todosPdvs.find(p => p.id !== idPdvEditando && p.loja_id === loja_id && p.numero_caixa === numero_caixa);
            if (duplicado) {
                exibirNotificacao("Já existe um caixa cadastrado com este número nesta unidade.", "erro");
                return;
            }

            dadosPdv.id = idPdvEditando;
            await new Promise((res, rej) => {
                const req = store.put(dadosPdv);
                req.onsuccess = () => res();
                req.onerror = () => rej(req.error);
            });

            exibirNotificacao(`Caixa ${numero_caixa} atualizado com sucesso!`, "sucesso");
            registrarLog("INFO", `PDV Caixa ${numero_caixa} (ID ${idPdvEditando}) na Loja ID ${loja_id} atualizado com sucesso.`);
            cancelarEdicaoPdv();
        } else {
            // Criação
            await salvarPdv(dadosPdv);
            registrarLog("INFO", `Novo PDV Caixa ${numero_caixa} cadastrado com sucesso para a Loja ID ${loja_id}.`);
            exibirNotificacao(`Caixa ${numero_caixa} cadastrado com sucesso!`, "sucesso");
            document.getElementById("formulario-cadastro-pdv").reset();
        }
        
        const lojaCadastroAtual = parseInt(document.getElementById("cadastro-pdv-selecao-loja").value);
        if (lojaCadastroAtual) renderizarListaPdvsCadastro(lojaCadastroAtual);
        
        alternarAba("aba-painel");
    } catch (erro) {
        console.error("Erro ao processar PDV:", erro);
        exibirNotificacao(erro.message || "Erro ao processar caixa.", "erro");
    }
}

async function atualizarDropdownLojaCadastro() {
    try {
        const lojas = await obterTodos("lojas");
        const select = document.getElementById("cadastro-pdv-selecao-loja");
        const valorAtual = select.value;
        
        select.innerHTML = `<option value="">Selecione a Loja...</option>`;
        lojas.forEach(l => {
            select.innerHTML += `<option value="${l.id}">${l.nome}</option>`;
        });
        
        if (valorAtual) select.value = valorAtual;
    } catch (erro) {
        console.error("Erro ao carregar lojas no cadastro de PDV:", erro);
    }
}

// Edição Inline
async function editarLoja(id) {
    try {
        const lojas = await obterTodos("lojas");
        const loja = lojas.find(l => l.id === id);
        if (loja) {
            // Expandir formulário se estiver colapsado
            const cabecalho = document.getElementById("cabecalho-loja-trigger");
            const corpo = document.getElementById("corpo-loja-cadastro");
            if (cabecalho && corpo) {
                cabecalho.classList.remove("colapsado");
                corpo.classList.remove("fechado");
            }

            document.getElementById("cadastro-loja-nome").value = loja.nome;
            document.getElementById("cadastro-loja-localizacao").value = loja.localizacao;
            
            idLojaEditando = id;
            document.getElementById("titulo-formulario-loja").innerHTML = `<i class="fas fa-edit"></i> Editar Loja`;
            document.getElementById("subtitulo-formulario-loja").innerText = `Editando unidade: ${loja.nome}`;
            document.getElementById("botao-submissao-loja").innerHTML = `<i class="fas fa-save"></i> Salvar Alterações`;
            document.getElementById("botao-cancelar-edicao-loja").style.display = "block";
            
            document.getElementById("titulo-formulario-loja").scrollIntoView({ behavior: "smooth" });
        }
    } catch (erro) {
        console.error("Erro ao buscar loja para edição:", erro);
    }
}

async function editarPdv(id) {
    try {
        const pdvs = await obterTodos("pdvs");
        const pdv = pdvs.find(p => p.id === id);
        if (pdv) {
            // Expandir formulário se estiver colapsado
            const cabecalho = document.getElementById("cabecalho-pdv-trigger");
            const corpo = document.getElementById("corpo-pdv-cadastro");
            if (cabecalho && corpo) {
                cabecalho.classList.remove("colapsado");
                corpo.classList.remove("fechado");
            }

            document.getElementById("cadastro-pdv-selecao-loja").value = pdv.loja_id;
            document.getElementById("cadastro-pdv-numero").value = pdv.numero_caixa;
            document.getElementById("cadastro-pdv-ram").value = pdv.ram;
            document.getElementById("cadastro-pdv-so").value = pdv.so;
            document.getElementById("cadastro-pdv-versao").value = pdv.versao;
            document.getElementById("cadastro-pdv-bios").value = pdv.bios;
            
            idPdvEditando = id;
            document.getElementById("titulo-formulario-pdv").innerHTML = `<i class="fas fa-edit"></i> Editar PDV`;
            document.getElementById("subtitulo-formulario-pdv").innerText = `Editando Caixa ${pdv.numero_caixa}`;
            document.getElementById("botao-submissao-pdv").innerHTML = `<i class="fas fa-save"></i> Salvar Alterações`;
            document.getElementById("botao-cancelar-edicao-pdv").style.display = "block";
            
            document.getElementById("titulo-formulario-pdv").scrollIntoView({ behavior: "smooth" });
        }
    } catch (erro) {
        console.error("Erro ao buscar PDV para edição:", erro);
    }
}

function cancelarEdicaoLoja() {
    document.getElementById("formulario-cadastro-loja").reset();
    idLojaEditando = null;
    document.getElementById("titulo-formulario-loja").innerHTML = `<i class="fas fa-store"></i> Cadastrar Nova Loja`;
    document.getElementById("subtitulo-formulario-loja").innerText = "Adicione uma nova unidade física do supermercado ao sistema.";
    document.getElementById("botao-submissao-loja").innerHTML = `<i class="fas fa-plus"></i> Cadastrar Loja`;
    document.getElementById("botao-cancelar-edicao-loja").style.display = "none";
}

function cancelarEdicaoPdv() {
    document.getElementById("formulario-cadastro-pdv").reset();
    idPdvEditando = null;
    document.getElementById("titulo-formulario-pdv").innerHTML = `<i class="fas fa-desktop"></i> Cadastrar Novo PDV (Caixa)`;
    document.getElementById("subtitulo-formulario-pdv").innerText = "Adicione um computador de checkout a uma unidade existente.";
    document.getElementById("botao-submissao-pdv").innerHTML = `<i class="fas fa-plus"></i> Cadastrar PDV`;
    document.getElementById("botao-cancelar-edicao-pdv").style.display = "none";
    
    // Limpa caixas cadastrados
    document.getElementById("lista-pdvs-cadastro").innerHTML = `<p style="color: var(--texto-secundario); font-size: 13px;">Selecione uma loja acima para listar os caixas.</p>`;
}

async function renderizarListaLojasCadastro() {
    try {
        const lojas = await obterTodos("lojas");
        const container = document.getElementById("lista-lojas-cadastro");
        container.innerHTML = "";
        
        if (lojas.length === 0) {
            container.innerHTML = `<p style="color: var(--texto-secundario); font-size: 13px;">Nenhuma unidade cadastrada.</p>`;
            return;
        }
        
        lojas.forEach(l => {
            const div = document.createElement("div");
            div.className = "mini-item-lista";
            div.innerHTML = `
                <div>
                    <div class="mini-item-lista-texto">${l.nome}</div>
                    <div class="mini-item-lista-sub">${l.localizacao}</div>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button type="button" class="botao-primario" style="padding: 6px 10px; font-size: 12px; margin: 0; background: var(--primaria);" onclick="editarLoja(${l.id})" title="Editar Loja" aria-label="Editar Loja">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="botao-primario" style="padding: 6px 10px; font-size: 12px; margin: 0; background: var(--status-alerta); border-color: rgba(231, 111, 81, 0.4);" onclick="confirmarExclusaoLoja(${l.id})" title="Excluir Loja" aria-label="Excluir Loja">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (erro) {
        console.error("Erro ao renderizar lista de lojas:", erro);
    }
}

async function renderizarListaPdvsCadastro(idLoja) {
    const container = document.getElementById("lista-pdvs-cadastro");
    container.innerHTML = "";
    
    if (!idLoja) {
        container.innerHTML = `<p style="color: var(--texto-secundario); font-size: 13px;">Selecione uma loja acima para listar os caixas.</p>`;
        return;
    }
    
    try {
        const pdvs = await obterPdvsPorLoja(idLoja);
        if (pdvs.length === 0) {
            container.innerHTML = `<p style="color: var(--texto-secundario); font-size: 13px;">Nenhum caixa cadastrado nesta unidade.</p>`;
            return;
        }
        
        pdvs.sort((a, b) => a.numero_caixa - b.numero_caixa);
        pdvs.forEach(p => {
            const div = document.createElement("div");
            div.className = "mini-item-lista";
            div.innerHTML = `
                <div>
                    <div class="mini-item-lista-texto">Caixa ${p.numero_caixa}</div>
                    <div class="mini-item-lista-sub">${p.so} • ${p.ram} GB • ${p.bios}</div>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button type="button" class="botao-primario" style="padding: 6px 10px; font-size: 12px; margin: 0; background: var(--primaria);" onclick="editarPdv(${p.id})" title="Editar PDV" aria-label="Editar PDV">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="botao-primario" style="padding: 6px 10px; font-size: 12px; margin: 0; background: var(--status-alerta); border-color: rgba(231, 111, 81, 0.4);" onclick="confirmarExclusaoPdv(${p.id})" title="Excluir PDV" aria-label="Excluir PDV">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (erro) {
        console.error("Erro ao renderizar lista de PDVs:", erro);
    }
}

// Exclusão física com Cascade Delete
async function confirmarExclusaoLoja(id) {
    try {
        const lojas = await obterTodos("lojas");
        const loja = lojas.find(l => l.id === id);
        if (!loja) return;
        
        if (confirm(`ATENÇÃO: Tem certeza que deseja excluir a loja "${loja.nome}"?\n\nTodos os caixas (PDVs) vinculados a esta unidade e todo o histórico de auditorias/fotos serão excluídos PERMANENTEMENTE!`)) {
            if (idLojaEditando === id) {
                cancelarEdicaoLoja();
            }

            const pdvs = await obterPdvsPorLoja(id);
            const idsPdvs = pdvs.map(p => p.id);

            const transacao = bd.transaction(["lojas", "pdvs", "auditorias"], "readwrite");
            const storeLojas = transacao.objectStore("lojas");
            const storePdvs = transacao.objectStore("pdvs");
            const storeAuditorias = transacao.objectStore("auditorias");

            // 1. Cascade: Auditorias
            const reqAudits = storeAuditorias.getAll();
            reqAudits.onsuccess = () => {
                const auditorias = reqAudits.result;
                auditorias.forEach(a => {
                    if (idsPdvs.includes(a.pdv_id)) {
                        storeAuditorias.delete(a.id);
                    }
                });
            };

            // 2. Cascade: PDVs
            idsPdvs.forEach(pid => storePdvs.delete(pid));

            // 3. Excluir loja
            storeLojas.delete(id);

            transacao.oncomplete = async () => {
                exibirNotificacao(`Unidade "${loja.nome}" excluída com sucesso!`, "sucesso");
                registrarLog("AVISO", `Loja "${loja.nome}" (ID ${id}) e todos os caixas e auditorias associados foram EXCLUÍDOS permanentemente.`);
                await carregarFiltrosLojas();
                await atualizarDropdownLojaCadastro();
                await renderizarListaLojasCadastro();

                const lojaCadastroAtual = document.getElementById("cadastro-pdv-selecao-loja").value;
                if (lojaCadastroAtual === "") {
                    document.getElementById("lista-pdvs-cadastro").innerHTML = `<p style="color: var(--texto-secundario); font-size: 13px;">Selecione uma loja acima para listar os caixas.</p>`;
                } else {
                    renderizarListaPdvsCadastro(parseInt(lojaCadastroAtual));
                }

                reiniciarFormularioAuditoria();
                
                const filtroAtual = document.getElementById("filtro-loja-painel").value;
                const idLoja = filtroAtual === "todas" ? "todas" : parseInt(filtroAtual);
                carregarDadosPainel(idLoja);
            };
        }
    } catch (erro) {
        console.error("Erro ao deletar loja:", erro);
        exibirNotificacao("Erro ao excluir loja.", "erro");
    }
}

async function confirmarExclusaoPdv(id) {
    try {
        const pdvs = await obterTodos("pdvs");
        const pdv = pdvs.find(p => p.id === id);
        if (!pdv) return;

        if (confirm(`Tem certeza que deseja excluir o Caixa ${pdv.numero_caixa} desta unidade?\n\nTodo o histórico de auditorias e fotos vinculados a este caixa serão excluídos PERMANENTEMENTE!`)) {
            if (idPdvEditando === id) {
                cancelarEdicaoPdv();
            }

            const transacao = bd.transaction(["pdvs", "auditorias"], "readwrite");
            const storePdvs = transacao.objectStore("pdvs");
            const storeAuditorias = transacao.objectStore("auditorias");

            // 1. Cascade: Auditorias
            const reqAudits = storeAuditorias.getAll();
            reqAudits.onsuccess = () => {
                const auditorias = reqAudits.result;
                auditorias.forEach(a => {
                    if (a.pdv_id === id) {
                        storeAuditorias.delete(a.id);
                    }
                });
            };

            // 2. Excluir PDV
            storePdvs.delete(id);

            transacao.oncomplete = () => {
                exibirNotificacao(`Caixa ${pdv.numero_caixa} excluído com sucesso!`, "sucesso");
                registrarLog("AVISO", `PDV Caixa ${pdv.numero_caixa} (ID ${id}) na Loja ID ${pdv.loja_id} e todas as suas auditorias associadas foram EXCLUÍDOS permanentemente.`);
                const lojaCadastroAtual = document.getElementById("cadastro-pdv-selecao-loja").value;
                if (lojaCadastroAtual) {
                    renderizarListaPdvsCadastro(parseInt(lojaCadastroAtual));
                }
                
                const filtroAtual = document.getElementById("filtro-loja-painel").value;
                const idLoja = filtroAtual === "todas" ? "todas" : parseInt(filtroAtual);
                carregarDadosPainel(idLoja);
            };
        }
    } catch (erro) {
        console.error("Erro ao deletar PDV:", erro);
        exibirNotificacao("Erro ao excluir caixa.", "erro");
    }
}

// ==========================================
// 9.3 CADASTROS E CONTROLE DE TÉCNICOS
// ==========================================
async function carregarDropdownTecnicos() {
    try {
        const tecnicos = await obterTodos("tecnicos");
        const seletor = document.getElementById("formulario-tecnico");
        seletor.innerHTML = `<option value="">Selecione o Técnico...</option>`;
        tecnicos.forEach(t => {
            seletor.innerHTML += `<option value="${t.id}">${t.nome}</option>`;
        });
    } catch (erro) {
        console.error("Erro ao carregar técnicos para formulário:", erro);
    }
}

async function processarCadastroTecnico(evento) {
    evento.preventDefault();
    const nome = document.getElementById("cadastro-tecnico-nome").value.trim();
    const email = document.getElementById("cadastro-tecnico-email").value.trim();
    const telefone = document.getElementById("cadastro-tecnico-telefone").value.trim();

    if (!nome || !email) {
        exibirNotificacao("Por favor, preencha todos os campos obrigatórios.", "erro");
        return;
    }

    try {
        const tecnicos = await obterTodos("tecnicos");
        
        // Evitar duplicados
        const duplicado = tecnicos.find(t => t.id !== idTecnicoEditando && t.email.toLowerCase() === email.toLowerCase());
        if (duplicado) {
            exibirNotificacao("Já existe um técnico cadastrado com este e-mail.", "erro");
            return;
        }

        const dadosTecnico = { nome, email, telefone };

        if (idTecnicoEditando) {
            // Edição
            dadosTecnico.id = idTecnicoEditando;
            const transacao = bd.transaction(["tecnicos"], "readwrite");
            const store = transacao.objectStore("tecnicos");
            await new Promise((res, rej) => {
                const req = store.put(dadosTecnico);
                req.onsuccess = () => res();
                req.onerror = () => rej(req.error);
            });
            exibirNotificacao(`Técnico "${nome}" atualizado com sucesso!`, "sucesso");
            registrarLog("INFO", `Técnico "${nome}" (ID ${idTecnicoEditando}) atualizado com sucesso.`);
            cancelarEdicaoTecnico();
        } else {
            // Criação
            const transacao = bd.transaction(["tecnicos"], "readwrite");
            const store = transacao.objectStore("tecnicos");
            await new Promise((res, rej) => {
                const req = store.add(dadosTecnico);
                req.onsuccess = () => res();
                req.onerror = () => rej(req.error);
            });
            registrarLog("INFO", `Novo técnico "${nome}" cadastrado com sucesso.`);
            exibirNotificacao(`Técnico "${nome}" cadastrado com sucesso!`, "sucesso");
            document.getElementById("formulario-cadastro-tecnico").reset();
        }

        await renderizarListaTecnicosCadastro();
    } catch (erro) {
        console.error("Erro ao gravar técnico:", erro);
        exibirNotificacao("Erro ao processar o cadastro do técnico.", "erro");
    }
}

async function editarTecnico(id) {
    try {
        const tecnicos = await obterTodos("tecnicos");
        const tecnico = tecnicos.find(t => t.id === id);
        if (tecnico) {
            // Expandir formulário se estiver colapsado
            const cabecalho = document.getElementById("cabecalho-tecnico-trigger");
            const corpo = document.getElementById("corpo-tecnico-cadastro");
            if (cabecalho && corpo) {
                cabecalho.classList.remove("colapsado");
                corpo.classList.remove("fechado");
            }

            document.getElementById("cadastro-tecnico-nome").value = tecnico.nome;
            document.getElementById("cadastro-tecnico-email").value = tecnico.email;
            document.getElementById("cadastro-tecnico-telefone").value = tecnico.telefone || "";

            idTecnicoEditando = id;
            document.getElementById("titulo-formulario-tecnico").innerHTML = `<i class="fas fa-edit"></i> Editar Técnico`;
            document.getElementById("subtitulo-formulario-tecnico").innerText = `Editando técnico: ${tecnico.nome}`;
            document.getElementById("botao-submissao-tecnico").innerHTML = `<i class="fas fa-save"></i> Salvar Alterações`;
            document.getElementById("botao-cancelar-edicao-tecnico").style.display = "block";

            document.getElementById("titulo-formulario-tecnico").scrollIntoView({ behavior: "smooth" });
        }
    } catch (erro) {
        console.error("Erro ao buscar técnico para edição:", erro);
    }
}

function cancelarEdicaoTecnico() {
    document.getElementById("formulario-cadastro-tecnico").reset();
    idTecnicoEditando = null;
    document.getElementById("titulo-formulario-tecnico").innerHTML = `<i class="fas fa-user-cog"></i> Cadastrar Novo Técnico`;
    document.getElementById("subtitulo-formulario-tecnico").innerText = "Adicione um novo técnico responsável ao sistema de TI.";
    document.getElementById("botao-submissao-tecnico").innerHTML = `<i class="fas fa-plus"></i> Cadastrar Técnico`;
    document.getElementById("botao-cancelar-edicao-tecnico").style.display = "none";
}

async function renderizarListaTecnicosCadastro() {
    try {
        const tecnicos = await obterTodos("tecnicos");
        const container = document.getElementById("lista-tecnicos-cadastro");
        container.innerHTML = "";

        if (tecnicos.length === 0) {
            container.innerHTML = `<p style="color: var(--texto-secundario); font-size: 13px;">Nenhum técnico cadastrado.</p>`;
            return;
        }

        tecnicos.sort((a, b) => a.nome.localeCompare(b.nome));
        tecnicos.forEach(t => {
            const div = document.createElement("div");
            div.className = "mini-item-lista";
            div.innerHTML = `
                <div>
                    <div class="mini-item-lista-texto">${t.nome}</div>
                    <div class="mini-item-lista-sub">${t.email} ${t.telefone ? `• ${t.telefone}` : ""}</div>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button type="button" class="botao-primario" style="padding: 6px 10px; font-size: 12px; margin: 0; background: var(--primaria);" onclick="editarTecnico(${t.id})" title="Editar Técnico" aria-label="Editar Técnico">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="botao-primario" style="padding: 6px 10px; font-size: 12px; margin: 0; background: var(--status-alerta); border-color: rgba(231, 111, 81, 0.4);" onclick="confirmarExclusaoTecnico(${t.id})" title="Excluir Técnico" aria-label="Excluir Técnico">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (erro) {
        console.error("Erro ao renderizar lista de técnicos:", erro);
    }
}

async function confirmarExclusaoTecnico(id) {
    try {
        const tecnicos = await obterTodos("tecnicos");
        const tecnico = tecnicos.find(t => t.id === id);
        if (!tecnico) return;

        if (confirm(`Tem certeza que deseja excluir o técnico "${tecnico.nome}" do sistema?\n\nEle não aparecerá mais nos formulários de novas inspeções (históricos anteriores não serão afetados).`)) {
            if (idTecnicoEditando === id) {
                cancelarEdicaoTecnico();
            }

            const transacao = bd.transaction(["tecnicos"], "readwrite");
            const store = transacao.objectStore("tecnicos");
            store.delete(id);

            transacao.oncomplete = async () => {
                exibirNotificacao(`Técnico "${tecnico.nome}" excluído com sucesso!`, "sucesso");
                registrarLog("AVISO", `Técnico "${tecnico.nome}" (ID ${id}) excluído do cadastro da plataforma.`);
                await renderizarListaTecnicosCadastro();
                const seletorForm = document.getElementById("formulario-tecnico");
                if (seletorForm) carregarDropdownTecnicos();
            };
        }
    } catch (erro) {
        console.error("Erro ao deletar técnico:", erro);
        exibirNotificacao("Erro ao excluir técnico.", "erro");
    }
}

// Utilitários de UI
function exibirNotificacao(mensagem, tipo = "sucesso") {
    const container = document.getElementById("conteiner-notificacoes");
    const toast = document.createElement("div");
    toast.className = `notificacao-toast ${tipo}`;
    
    const icone = tipo === "sucesso" 
        ? `<i class="fas fa-check-circle" style="color: var(--status-ok);"></i>` 
        : `<i class="fas fa-exclamation-circle" style="color: var(--status-alerta);"></i>`;

    toast.innerHTML = `
        ${icone}
        <span>${mensagem}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "deslizarEntrada 0.3s ease reverse";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function alternarColapsoFormulario(idCabecalho, idCorpo) {
    const cabecalho = document.getElementById(idCabecalho);
    const corpo = document.getElementById(idCorpo);
    if (cabecalho && corpo) {
        cabecalho.classList.toggle("colapsado");
        corpo.classList.toggle("fechado");
    }
}

// ==========================================
// 10. GESTÃO E EXPORTAÇÃO DE LOGS DE EVENTOS
// ==========================================
function registrarLog(tipo, descricao) {
    const data = new Date().toISOString();
    const log = { data, tipo, descricao };
    console.log(`[Campelo TI] [${tipo}] ${descricao}`);
    
    if (!bd) return Promise.resolve();
    
    return new Promise((resolver) => {
        try {
            const transacao = bd.transaction(["logs"], "readwrite");
            const store = transacao.objectStore("logs");
            const req = store.add(log);
            req.onsuccess = () => resolver();
            req.onerror = () => resolver();
        } catch (e) {
            console.error("Erro ao registrar log:", e);
            resolver();
        }
    });
}

async function baixarArquivoLogs() {
    try {
        const logs = await obterTodos("logs");
        logs.sort((a, b) => new Date(a.data) - new Date(b.data));
        
        let textoLogs = "========================================================\n";
        textoLogs += "   RELATÓRIO DE EVENTOS DA PLATAFORMA DE AUDITORIA TI   \n";
        textoLogs += `   Exportado em: ${new Date().toLocaleString("pt-BR")} \n`;
        textoLogs += "========================================================\n\n";
        
        if (logs.length === 0) {
            textoLogs += "[SEM REGISTROS DE EVENTOS AINDA]\n";
        } else {
            logs.forEach(l => {
                const dataFormatada = new Date(l.data).toLocaleString("pt-BR");
                textoLogs += `[${dataFormatada}] [${l.tipo.toUpperCase()}] ${l.descricao}\n`;
            });
        }
        
        const blob = new Blob([textoLogs], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "eventos.log";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        registrarLog("INFO", "Logs exportados com sucesso pelo usuário.");
        exibirNotificacao("Arquivo eventos.log baixado com sucesso!", "sucesso");
    } catch (e) {
        console.error("Erro ao exportar logs:", e);
        exibirNotificacao("Erro ao exportar arquivo de logs.", "erro");
    }
}

// Vincular funções no escopo global para escuta do HTML
window.editarLoja = editarLoja;
window.editarPdv = editarPdv;
window.editarTecnico = editarTecnico;
window.cancelarEdicaoLoja = cancelarEdicaoLoja;
window.cancelarEdicaoPdv = cancelarEdicaoPdv;
window.cancelarEdicaoTecnico = cancelarEdicaoTecnico;
window.confirmarExclusaoLoja = confirmarExclusaoLoja;
window.confirmarExclusaoPdv = confirmarExclusaoPdv;
window.confirmarExclusaoTecnico = confirmarExclusaoTecnico;
window.exportarPdfAuditoria = exportarPdfAuditoria;
window.gerarRelatorioGeralPdf = gerarRelatorioGeralPdf;
window.abrirModalDetalhesPdv = abrirModalDetalhesPdv;
window.fecharModal = fecharModal;
window.alternarAba = alternarAba;
window.alternarColapsoFormulario = alternarColapsoFormulario;
window.registrarLog = registrarLog;
window.baixarArquivoLogs = baixarArquivoLogs;

