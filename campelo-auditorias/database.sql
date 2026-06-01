-- ==========================================
-- SCHEMA DE BANCO DE DADOS - AUDITORIA TI
-- CAMPELO SUPERMERCADOS
-- ==========================================

-- Tabela Lojas
-- Contém a identificação de cada unidade física do supermercado.
CREATE TABLE lojas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(100) NOT NULL UNIQUE,
    localizacao VARCHAR(255) NOT NULL
);

-- Tabela PDVs (Pontos de Venda / Caixas)
-- Cada PDV pertence a uma loja e armazena suas especificações de hardware.
CREATE TABLE pdvs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loja_id INTEGER NOT NULL,
    numero_caixa INTEGER NOT NULL,
    so VARCHAR(50) NOT NULL,            -- Ex: 'Windows 10 IoT', 'Ubuntu 22.04'
    versao VARCHAR(50) NOT NULL,        -- Versão do Sistema Operacional ou software de caixa
    ram INTEGER NOT NULL,               -- Quantidade de RAM instalada (em GB, Ex: 4, 8, 16)
    bios VARCHAR(20) NOT NULL,          -- Restrição: 'UEFI' ou 'Legacy'
    FOREIGN KEY (loja_id) REFERENCES lojas(id) ON DELETE CASCADE,
    UNIQUE (loja_id, numero_caixa)      -- Garante caixa único por loja
);

-- Tabela Auditorias
-- Registros das inspeções preventivas e corretivas feitas pelos técnicos em cada PDV.
CREATE TABLE auditorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pdv_id INTEGER NOT NULL,
    data DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tecnico VARCHAR(100) NOT NULL,
    status_impressora VARCHAR(10) NOT NULL,   -- Restrição: 'OK' ou 'Atenção'
    status_leitor VARCHAR(10) NOT NULL,       -- Restrição: 'OK' ou 'Atenção'
    status_teclado_mouse VARCHAR(10) NOT NULL, -- Restrição: 'OK' ou 'Atenção'
    estado_gabinete VARCHAR(10) NOT NULL,     -- Restrição: 'OK' ou 'Atenção'
    observacoes TEXT,
    imagem_url TEXT,                         -- Caminho ou hash de armazenamento (Base64/Blob local)
    FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE CASCADE
);

-- ==========================================
-- ÍNDICES DE DESEMPENHO E CONSULTA
-- ==========================================
CREATE INDEX idx_pdvs_loja ON pdvs(loja_id);
CREATE INDEX idx_auditorias_pdv ON auditorias(pdv_id);
CREATE INDEX idx_auditorias_data ON auditorias(data);
