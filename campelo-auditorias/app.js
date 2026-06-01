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

// Inicialização da Aplicação
document.addEventListener("DOMContentLoaded", () => {
    inicializarBancoDeDados()
        .then(() => {
            configurarOuvintesEventos();
            carregarFiltrosLojas();
            alternarAba("aba-painel");
            exibirNotificacao("Plataforma carregada e pronta!", "sucesso");
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
        const requisicao = indexedDB.open("CampeloAuditDB", 1);

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
    const transacao = bd.transaction(["lojas", "pdvs", "auditorias"], "readwrite");
    const storeLojas = transacao.objectStore("lojas");
    const storePdvs = transacao.objectStore("pdvs");
    const storeAuditorias = transacao.objectStore("auditorias");

    // Verificar se já possui lojas
    const requisicaoContagem = storeLojas.count();
    return new Promise((resolver, rejeitar) => {
        requisicaoContagem.onsuccess = async () => {
            if (requisicaoContagem.result === 0) {
                console.log("Banco de dados vazio! Semeando dados padrão...");
                
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

    // Cancelamento de Edições
    document.getElementById("botao-cancelar-edicao-loja").addEventListener("click", cancelarEdicaoLoja);
    document.getElementById("botao-cancelar-edicao-pdv").addEventListener("click", cancelarEdicaoPdv);

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
    } else if (idAba === "aba-todos-pdvs") {
        carregarVisualizacaoListaPdvs();
    } else if (idAba === "aba-cadastros") {
        cancelarEdicaoLoja();
        cancelarEdicaoPdv();
        atualizarDropdownLojaCadastro();
        renderizarListaLojasCadastro();
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
    const tecnico = document.getElementById("formulario-tecnico").value.trim();
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
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        exibirNotificacao("Gerando PDF...", "sucesso");
        html2pdf().from(elemento).set(opcoes).save()
            .then(() => exibirNotificacao("PDF exportado com sucesso!", "sucesso"))
            .catch(erro => {
                console.error("Erro ao gerar PDF:", erro);
                exibirNotificacao("Erro ao exportar PDF.", "erro");
            });

    } catch (erro) {
        console.error("Erro na exportação do PDF:", erro);
    }
}

// Relatório Geral Compilado (html2pdf.js)
async function gerarRelatorioGeralPdf() {
    try {
        const filtroLoja = document.getElementById("filtro-loja-painel").value;
        const lojas = await obterTodos("lojas");
        const pdvs = await obterTodos("pdvs");
        const auditorias = await obterTodos("auditorias");

        // Identificar loja ativa
        let lojaAtiva = null;
        let pdvsFiltrados = [];

        if (filtroLoja === "todas") {
            pdvsFiltrados = pdvs;
        } else {
            const idLoja = parseInt(filtroLoja);
            lojaAtiva = lojas.find(l => l.id === idLoja);
            pdvsFiltrados = pdvs.filter(p => p.loja_id === idLoja);
        }

        if (pdvsFiltrados.length === 0) {
            exibirNotificacao("Não há caixas cadastrados para gerar o relatório.", "erro");
            return;
        }

        // Ordenar PDVs por caixa para consistência do relatório
        pdvsFiltrados.sort((a, b) => a.numero_caixa - b.numero_caixa);

        // Mapear lojas por ID
        const mapaLojas = {};
        lojas.forEach(l => mapaLojas[l.id] = l);

        // Encontrar a última auditoria para cada PDV
        const mapaUltimaAuditoria = {};
        auditorias.forEach(a => {
            const existente = mapaUltimaAuditoria[a.pdv_id];
            if (!existente || new Date(a.data) > new Date(existente.data)) {
                mapaUltimaAuditoria[a.pdv_id] = a;
            }
        });

        // Criar elemento HTML temporário para o PDF Geral nos bastidores
        const conteinerPdf = document.createElement("div");
        conteinerPdf.id = "template-pdf-geral";

        // Coletar técnicos únicos que participaram
        const tecnicosUnicos = new Set();
        pdvsFiltrados.forEach(p => {
            const audit = mapaUltimaAuditoria[p.id];
            if (audit && audit.tecnico) {
                tecnicosUnicos.add(audit.tecnico);
            }
        });
        const listaTecnicos = tecnicosUnicos.size > 0 ? Array.from(tecnicosUnicos).join(", ") : "Sem inspeções";

        const dataAtual = new Date();
        const dataFormatada = dataAtual.toLocaleDateString("pt-BR");
        
        // Cabeçalho institucional do PDF Geral
        let htmlCompilado = `
            <div class="pdf-cabecalho">
                <img src="./logo.png" class="pdf-logo" alt="Logo Campelo" style="border-radius: 6px; overflow: hidden;">
                <div class="pdf-bloco-titulo pdf-titulo-verde-escuro">
                    <h1>RELATÓRIO DE AUDITORIA DE TI</h1>
                    <p>Campelo Supermercados • Consolidação de PDVs</p>
                </div>
            </div>

            <div class="pdf-titulo-secao">Dados Gerais da Unidade</div>
            <div class="pdf-grade-meta" style="margin-bottom: 30px;">
                <div class="pdf-item-meta">
                    <span class="pdf-rotulo-meta">Unidade de TI</span>
                    <span class="pdf-valor-meta">${lojaAtiva ? lojaAtiva.nome : "Todas as Unidades"}</span>
                </div>
                <div class="pdf-item-meta" style="grid-column: span 2;">
                    <span class="pdf-rotulo-meta">Endereço / Localização</span>
                    <span class="pdf-valor-meta" style="font-size: 11px;">${lojaAtiva ? lojaAtiva.localizacao : "Rede Geral Supermercados Campelo"}</span>
                </div>
                <div class="pdf-item-meta">
                    <span class="pdf-rotulo-meta">Data de Emissão</span>
                    <span class="pdf-valor-meta">${dataFormatada}</span>
                </div>
            </div>
            
            <div style="margin-bottom: 30px;">
                <span class="pdf-rotulo-meta" style="display:block; margin-bottom: 4px;">Técnicos de Auditoria Participantes</span>
                <span class="pdf-valor-meta" style="font-weight: 500; font-size: 12px; color: #555;">${listaTecnicos}</span>
            </div>

            <div class="pdf-titulo-secao" style="margin-bottom: 20px;">Detalhes e Inspeções de Checkout</div>
        `;

        // Gerar o bloco de cada PDV
        pdvsFiltrados.forEach(p => {
            const nomeLoja = mapaLojas[p.loja_id] ? mapaLojas[p.loja_id].nome : "Loja Desconhecida";
            const auditoria = mapaUltimaAuditoria[p.id];
            
            let statusBloco = "Pendente";
            let tecnicoPdv = "-";
            let dataPdv = "Não Realizada";
            let observacoesPdv = "Nenhum histórico de auditoria registrado no sistema para este checkout.";
            let imagemHtml = "";

            if (auditoria) {
                statusBloco = "Auditado";
                tecnicoPdv = auditoria.tecnico;
                dataPdv = new Date(auditoria.data).toLocaleString("pt-BR");
                observacoesPdv = auditoria.observacoes || "Sem observações registradas.";
                
                if (auditoria.imagem_url) {
                    imagemHtml = `
                        <div class="pdf-galeria-fotos">
                            <div class="pdf-foto-container-legenda">
                                <img src="${auditoria.imagem_url}" style="width: 190px; height: 190px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd;" alt="Foto do Gabinete">
                                <span class="pdf-legenda-foto">Gabinete - Caixa ${p.numero_caixa}</span>
                            </div>
                        </div>
                    `;
                }
            }

            htmlCompilado += `
                <div class="pdf-bloco-pdv">
                    <div class="pdf-bloco-pdv-titulo">
                        Caixa ${p.numero_caixa} • ${nomeLoja} (${statusBloco})
                    </div>
                    
                    <!-- Seção 1 (Header do Caixa) -->
                    <table class="pdf-tabela" style="margin-bottom: 12px; background: #fafafa;">
                        <tbody>
                            <tr>
                                <td style="width: 25%; font-weight: bold; background: #f0f0f0;">Técnico da Auditoria</td>
                                <td style="width: 25%;">${tecnicoPdv}</td>
                                <td style="width: 25%; font-weight: bold; background: #f0f0f0;">Data da Auditoria</td>
                                <td style="width: 25%;">${dataPdv}</td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Seção 2 (Tabela Técnica) -->
                    <table class="pdf-tabela" style="margin-bottom: 12px;">
                        <thead>
                            <tr>
                                <th>Número do PDV</th>
                                <th>Sistema Operacional / Versão</th>
                                <th>Memória RAM (GB)</th>
                                <th>Tipo de BIOS</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Caixa ${p.numero_caixa}</td>
                                <td>${p.so} (v${p.versao})</td>
                                <td>
                                    <span class="${p.ram < 8 ? 'pdf-ram-alerta' : ''}">
                                        ${p.ram} GB ${p.ram < 8 ? '(Upgrade Requerido)' : '(OK)'}
                                    </span>
                                </td>
                                <td>${p.bios}</td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Seção 3 (Periféricos) -->
                    <table class="pdf-tabela" style="margin-bottom: 12px;">
                        <thead>
                            <tr>
                                <th>Impressora Térmica</th>
                                <th>Leitor de Código</th>
                                <th>Teclado / Mouse</th>
                                <th>Gabinete / CPU</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${auditoria ? `
                                <tr>
                                    <td class="${auditoria.status_impressora === 'OK' ? 'ok' : 'atencao'}">${auditoria.status_impressora}</td>
                                    <td class="${auditoria.status_leitor === 'OK' ? 'ok' : 'atencao'}">${auditoria.status_leitor}</td>
                                    <td class="${auditoria.status_teclado_mouse === 'OK' ? 'ok' : 'atencao'}">${auditoria.status_teclado_mouse}</td>
                                    <td class="${auditoria.estado_gabinete === 'OK' ? 'ok' : 'atencao'}">${auditoria.estado_gabinete}</td>
                                </tr>
                            ` : `
                                <tr>
                                    <td colspan="4" style="text-align: center; color: #999; font-style: italic;">
                                        Este computador ainda não passou por nenhuma inspeção preventiva ou corretiva.
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>

                    <div style="font-size: 11px; margin-top: 8px;">
                        <strong>Observações de Campo:</strong>
                        <div style="background: #fdfdfd; border: 1px solid #eee; padding: 10px; border-radius: 4px; margin-top: 4px; font-style: italic; color: #555;">
                            "${observacoesPdv}"
                        </div>
                    </div>
                    
                    ${imagemHtml}
                </div>
            `;
        });

        // Rodapé final do relatório
        htmlCompilado += `
            <div class="pdf-nota-rodape" style="margin-top: 30px;">
                Relatório Geral Consolidado emitido em conformidade com as políticas internas do Supermercados Campelo.<br>
                © 2026 Campelo Supermercados. Todos os direitos reservados.
            </div>
        `;

        conteinerPdf.innerHTML = htmlCompilado;
        document.body.appendChild(conteinerPdf);

        // Formatação do Nome do Arquivo
        const ano = dataAtual.getFullYear();
        const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
        const dia = String(dataAtual.getDate()).padStart(2, '0');
        const stringDataArquivo = `${ano}-${mes}-${dia}`;
        const nomeLojaLimpo = lojaAtiva ? lojaAtiva.nome.replace(/\s+/g, "_") : "Rede_Geral";

        const opcoes = {
            margin: 10,
            filename: `Relatorio_TI_Campelo_${nomeLojaLimpo}_${stringDataArquivo}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css'] }
        };

        exibirNotificacao("Compilando Relatório Geral...", "sucesso");
        
        html2pdf().from(conteinerPdf).set(opcoes).save()
            .then(() => {
                exibirNotificacao("Relatório Geral exportado com sucesso!", "sucesso");
                conteinerPdf.remove(); // Limpar elemento da memória
            })
            .catch(erro => {
                console.error("Erro ao gerar Relatório Geral PDF:", erro);
                exibirNotificacao("Erro ao exportar Relatório Geral.", "erro");
                conteinerPdf.remove();
            });

    } catch (erro) {
        console.error("Erro na compilação do relatório geral:", erro);
        exibirNotificacao("Erro ao compilar dados do relatório.", "erro");
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
            cancelarEdicaoLoja();
        } else {
            // Criação
            await salvarLoja({ nome, localizacao });
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
            cancelarEdicaoPdv();
        } else {
            // Criação
            await salvarPdv(dadosPdv);
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

// Vincular funções no escopo global para escuta do HTML
window.editarLoja = editarLoja;
window.editarPdv = editarPdv;
window.cancelarEdicaoLoja = cancelarEdicaoLoja;
window.cancelarEdicaoPdv = cancelarEdicaoPdv;
window.confirmarExclusaoLoja = confirmarExclusaoLoja;
window.confirmarExclusaoPdv = confirmarExclusaoPdv;
window.exportarPdfAuditoria = exportarPdfAuditoria;
window.gerarRelatorioGeralPdf = gerarRelatorioGeralPdf;
window.abrirModalDetalhesPdv = abrirModalDetalhesPdv;
window.fecharModal = fecharModal;
window.alternarAba = alternarAba;
