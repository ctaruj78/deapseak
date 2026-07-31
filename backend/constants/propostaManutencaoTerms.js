// Condições Gerais completas do Contrato de Manutenção Simples FESTLIFT.
// Texto extraído dos contratos-modelo em HTML (CONTRATO_v1_padrao / CONTRATO_v2_flexivel),
// que têm as condições gerais idênticas (6 artigos, ~30 pontos). Usado tanto no PDF da
// proposta de manutenção como, no futuro, no contrato final assinado.
const CONDICOES_GERAIS_ARTIGOS = [
    {
        titulo: '1. Obrigações da FESTLIFT, Lda.',
        itens: [
            'Assegurar a manutenção do(s) ascensor(es) em conformidade com as disposições regulamentares de segurança em vigor e demais legislação aplicável.',
            'Pelo menos uma vez por mês, proceder à inspeção do(s) ascensor(es) e à realização dos trabalhos de conservação necessários à segurança e continuidade do seu funcionamento, de acordo com as condições regulamentares segundo o plano de manutenção que faz parte integrante do contrato.',
            'Colocar nas portas de patamar, durante o tempo necessário para conservação e inspeção, avisos identificativos "ASCENSOR(ES) FORA DE SERVIÇO".',
            'Registar no livro existente na casa da(s) máquina(s), as visitas de conservação ou inspeção efetuadas.',
            'Dispor de números de telefone devidamente identificados na(s) cabina(s) do(s) ascensor(es), para onde, no horário de expediente, poderão ser comunicadas pelo Cliente ou seu Representante as avarias ou anomalias de funcionamento.',
            'Inspecionar mediante aviso do Cliente ou seu Representante, em dias úteis e horário normal de serviço, o equipamento instalado de modo a identificar a causa da anomalia.',
            'Manter na empresa um registo, onde conste todos os avisos comunicados e avarias detetadas.',
            'Fornecer e utilizar para os trabalhos de manutenção e inspeção: massas e óleos lubrificantes recomendados (exceto o óleo do cárter da(s) máquina(s) e da(s) central(ais) hidráulica(s)); materiais de limpeza adequados; ferramentas e aparelhos de medida próprios.',
            'Manter os «stocks» de materiais necessários à substituição de peças.',
            'Ter estabelecido com empresa seguradora uma apólice de seguro de responsabilidade civil, que garanta o pagamento de indemnizações, até ao montante estabelecido no Decreto-Lei n.º 320/2002, devidas pelos danos materiais e/ou corporais sofridos pelos utentes do(s) ascensor(es).',
            'Comunicar ao Cliente, com a necessária prontidão, as reparações ou substituição de materiais aconselháveis para assegurar o regular funcionamento do(s) ascensor(es).',
            'Notificar o Cliente sempre que se verifique a imobilização do(s) ascensor(es) resultante de mau estado de qualquer órgão de segurança, ficando o(s) ascensor(es) desligado(s).',
            'Instruir o Cliente, ou pessoa por ele delegada e residente no edifício, para efetuar manobras manuais com o(s) ascensor(es), em casos de avaria ou falta de corrente, para o que será utilizada chave de emergência fornecida, exclusivamente, pela EMIE.',
            'Enviar ao Cliente os elementos necessários para que proceda ao pagamento da taxa devida pelas inspeções periódicas ao(s) ascensor(es) e proceder ao requerimento das inspeções periódicas, no prazo legal, à respetiva Câmara Municipal. Providenciar presença de Técnico, para acompanhamento do ato de realização de inspeção, inquérito ou peritagem.',
            'Disponibilizar um serviço permanente "Assistência 24 horas", em caso de encarceramento de pessoas ou imobilização do(s) ascensor(es).'
        ]
    },
    {
        titulo: '2. Responsabilidades',
        itens: [
            'O Cliente será responsabilizado pelos danos ou acidentes provocados por falsas manobras e utilização indevida das chaves especiais de emergência, existentes na casa da(s) máquina(s), ou em seu poder.',
            'O Cliente não pode permitir que estranhos intervenham na resolução de avarias ou reparações do equipamento, sem conhecimento da EMIE. Sempre que tal se verifique a EMIE poderá cancelar de imediato as suas responsabilidades contratuais, ficando o Cliente obrigado ao pagamento até ao final do prazo contratado.'
        ]
    },
    {
        titulo: '3. Exclusões',
        itens: [
            'A EMIE não garantirá o funcionamento do(s) ascensor(es) por causas estranhas e fora do seu controlo, como sejam: a) Infiltração de água e/ou inundação na caixa, casa da máquina ou poço; b) Utilização do(s) ascensor(es) com carga superior à indicada; c) Utilização do(s) ascensor(es) para fins diferentes dos previstos; d) Variação de tensão ou frequência de energia elétrica, diferindo mais de 5% dos valores nominais ou quaisquer interrupções do fornecimento de energia elétrica; e) Greves, atos de vandalismo, alterações de ordem pública, falta de meios de transporte ou mobilização; f) Deficiências de construção civil ou alterações posteriores da estrutura do edifício; g) Deflagração de incêndio no edifício.',
            'A EMIE não garante: a) Execução de qualquer trabalho fora das horas normais de serviço, salvo se especialmente contratado; b) Qualquer trabalho, serviço, material ou responsabilidade, que não estejam explicitamente especificados no contrato.'
        ]
    },
    {
        titulo: '4. Obrigações do Cliente',
        itens: [
            'O pagamento dos valores contratados e outros resultantes de trabalhos ou fornecimentos autorizados, será feito no prazo de 30 dias.',
            'Designar uma pessoa delegada e residente no edifício à qual será confiada a chave da casa da(s) máquina(s).',
            'Garantir que a casa da(s) máquina(s) está permanentemente fechada, sendo o acesso só autorizado a técnicos da EMIE ou à pessoa delegada.',
            'Impedir que na casa da(s) máquina(s) sejam armazenados materiais estranhos ao(s) ascensor(es).',
            'Não promover ou autorizar a execução de quaisquer trabalhos ou instalações na caixa, poço ou casa da(s) máquina(s), sem prévio conhecimento da EMIE.',
            'Assegurar o funcionamento regular da iluminação dos patamares servidos pelo(s) ascensor(es), assim como do local da casa da(s) máquina(s) e da(s) roda(s) de desvio.',
            'Avisar com prontidão a EMIE sempre que o(s) ascensor(es) esteja(m) parado(s) ou cujo funcionamento anormal não mereça confiança. Neste último caso, o(s) ascensor(es) deve(m) ficar desligado(s) até à chegada do técnico competente.',
            'O preço será revisto anualmente tendo como base o mínimo da evolução durante o último período conhecido de duração igual à da revisão de preço, do índice de Preços ao Consumidor (IPC), publicada pelo Instituto Nacional de Estatística (INE).',
            'Manter o(s) ascensor(es) de acordo com a legislação em vigor.',
            'O pagamento de serviço de atendimento de avarias não cobertas por este contrato, nomeadamente, mas não exclusivamente, as originadas pelos motivos expostos nas Exclusões, ou por falta de execução atempada de reparações já propostas pela EMIE.'
        ]
    },
    {
        titulo: '5. Pagamento',
        itens: [
            'Os pagamentos serão efetuados por uma das seguintes modalidades: a) Cheque ou Vale de correio enviado para os escritórios da FESTLIFT, Lda.; b) Pagamento nos escritórios; c) Depósito, Transferência bancária ou Débito direto.'
        ]
    },
    {
        titulo: '6. Competência para Dirimir Litígios de Consumo',
        itens: [
            'Em caso de litígio de consumo, definido nos termos do disposto na Lei n.º 144/2015, de 8 de setembro, o consumidor pode recorrer à entidade de resolução alternativa de litígios de consumo competente.',
            'Sem prejuízo do disposto na legislação, nos estatutos e nos regulamentos a que as entidades de resolução alternativa de litígios de consumo se encontram vinculadas, considera-se competente para dirimir o litígio de consumo, a entidade de resolução alternativa de litígios de consumo do local da celebração do contrato de compra e venda do bem ou da prestação de serviços ou em alternativa a entidade de resolução alternativa de competência especializada, caso exista para o setor em questão.',
            'Caso não exista entidade de resolução alternativa de litígios com competência no local da celebração do contrato ou a(s) existente(s) não se considere(m) competente(s) em razão do valor deste, o consumidor pode recorrer ao Centro Nacional de Informação e Arbitragem de Conflitos de Consumo, sito em Lisboa, com o endereço eletrónico cniacc@unl.pt e disponível na página www.arbitragemdeconsumo.org.'
        ]
    }
];

module.exports = { CONDICOES_GERAIS_ARTIGOS };
