// Atos normativos revogados/sem efeito (e circulares que limitam o seu uso) que os relatórios de inspeção ainda podem citar.
// Quando a `norma` de uma categoria menciona um destes atos, o orçamento acrescenta a nota de estado.
// Fonte: data/regulations/despacho-27-2024.json (Despacho n.º 27/2024, DGEG, 24/09/2024 — só revoga,
// não define novo regime). Acrescentar aqui apenas atos com revogação confirmada.
(function () {
    const NORMAS_REVOGADAS = [
        {
            re: /Despacho\s*(n\.?\s*º\s*)?17\s*\/\s*(DG\s*\/\s*)?2022/i,
            nota: 'Despacho n.º 17/2022 revogado pelo Despacho n.º 27/2024 (DGEG, 24/09/2024) — já não está em vigor'
        },
        {
            // Não é revogação: a circular retira valor de resultado de inspeção a este tipo de descritor.
            re: /Circular\s*IPAC\s*(n\.?\s*º\s*)?6\s*\/\s*2025/i,
            nota: 'Circular IPAC n.º 6/2025 (20/12/2025): a falta de declaração de conformidade/avaliação de modificação importante não é fundamento de resultado de inspeção — é registada como observação'
        },
        {
            re: /Despacho\s*(n\.?\s*º\s*)?18\s*\/\s*(DG\s*\/\s*)?2022/i,
            nota: 'Despacho n.º 18/2022 revogado pelo Despacho n.º 27/2024 (DGEG, 24/09/2024) — já não está em vigor'
        }
    ];

    window.NORMAS_REVOGADAS = NORMAS_REVOGADAS;
    window.notaNormaRevogada = function (norma) {
        const n = String(norma || '');
        return NORMAS_REVOGADAS.filter(x => x.re.test(n)).map(x => x.nota).join('; ');
    };
})();
