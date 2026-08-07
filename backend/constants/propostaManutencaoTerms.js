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

// Condições Gerais completas do Contrato de Manutenção Completa FESTLIFT.
// Texto extraído do contrato-modelo "Contrato manutençao completo FESTLIFT.pdf"
// (fornecido pelo utilizador em 2026-08-07). Ao contrário da Simples, a Completa
// inclui substituição preventiva de componentes, assistência técnica a avarias e
// materiais/peças no preço — daí a lista de exclusões e o bloco de materiais
// incluídos serem bastante mais detalhados.
const CONDICOES_GERAIS_ARTIGOS_COMPLETA = [
    {
        titulo: '1. Serviços Contratados',
        itens: [
            'Visitas Periódicas de Manutenção — De acordo com o Dec. Lei 320/2002 de 28 de Dezembro a FESTLIFT, Lda. compromete-se a inspecionar mensalmente o equipamento objeto deste contrato, assegurando a continuidade do seu funcionamento e dedicando especial atenção aos elementos de segurança tanto mecânicos como elétricos.',
            'Programa de Manutenção Preventivo — Este programa será desenvolvido pelo nosso pessoal técnico, coincidindo com as Inspeções Periódicas e consistindo na aplicação metódica do nosso Programa de Manutenção Preventivo, concebido de forma personalizada para cada instalação, garantindo a adequação entre as características do equipamento e o serviço de manutenção prestado. De acordo com o anexo II A do D.L. 320/02 de 28 de Dezembro, é efetuado o programa de manutenção conforme modelo anexo.',
            'Substituição Preventiva de Componentes — Tem como finalidade a substituição das peças do elevador sujeitas a desgaste, antes que um eventual mau funcionamento possa provocar avarias ou incidentes no normal funcionamento da instalação, tudo dentro do que seja possível prever.',
            'Assistência Técnica a Avarias — A FESTLIFT, Lda. obriga-se a atender prontamente, nas horas normais de serviço e todos os dias úteis, as solicitações do Cliente para reparação de avarias, sendo assegurada uma central telefónica de atendimento permanente. Fica estabelecido o prazo máximo de 24h00 úteis para a reposição do equipamento em funcionamento normal, exceto se não for possível a reparação e/ou substituição de peças. No caso de passageiros bloqueados no ascensor, é atribuída toda a prioridade à resolução da avaria.',
            'Acompanhamento a Entidades Oficiais — Durante as visitas às instalações objeto do presente contrato por parte de entidades oficiais, a FESTLIFT, Lda. compromete-se a estar presente e a prestar toda a assistência necessária. A FESTLIFT, Lda. solicita nos prazos legalmente estipulados às Câmaras Municipais as inspeções periódicas ao(s) ascensor(es).',
            'Assistência/Relatórios Técnicos Especializados — A pedido do Cliente, a FESTLIFT, Lda. efetuará a assistência e/ou assessoria técnica, incluindo, se necessário, informação sobre o estado dos equipamentos.',
            'Técnicos Especializados — A FESTLIFT, Lda. realizará os serviços de assistência técnica ao(s) elevador(es) objeto do presente contrato utilizando técnicos próprios, devidamente credenciados e em permanente formação, equipados com as ferramentas necessárias e com os meios de comunicação e transporte para um rápido atendimento dos clientes.',
            'Seguro de Responsabilidade Civil — Fica coberta, mediante a correspondente apólice subscrita com a Companhia de Seguros, toda a responsabilidade civil derivada da atividade da FESTLIFT, Lda. como EMIE.',
            'Comunicação Bidirecional de Emergência (se aplicável o DL 295/98) — Através do sistema de comunicação bidirecional, é assegurada a comunicação verbal entre o(s) passageiro(s) bloqueado(s) no interior da cabina e o Centro de Atendimento Permanente da FESTLIFT.',
            'Formação sobre Manobra de Socorro — A FESTLIFT, Lda. compromete-se a prestar a formação necessária ao Cliente sobre a manobra de socorro a efetuar para libertar pessoas bloqueadas na cabina, a pedido do Cliente e sem encargos adicionais.'
        ]
    },
    {
        titulo: '2. Serviço de Emergência 24 Horas e Materiais Incluídos',
        itens: [
            'A FESTLIFT, Lda. compromete-se a ter um serviço de emergência 24h00 por dia, todos os dias do ano, de intervenção rápida para desencarceramento de pessoas, conforme o Dec. Lei 320/2002 de 28 de Dezembro, assim como para os ascensores colocados em serviço nos termos do Decreto-Lei n.º 295/98, de 22 de Setembro.',
            'Materiais incluídos no presente contrato, sem encargo adicional: fornecimento de material de limpeza, óleo e massa lubrificante; órgãos da caixa — cabos de tração, limitador de velocidade, de compensação e do seletor de pisos e de fim de curso, cabos elétricos flexíveis, rodas de desvio e pára-quedas, fechaduras de segurança das portas de cabina e de piso, amortecedores, roçadeiras de cabina e contrapeso; órgãos da casa da máquina — motor elétrico, máquina de tração, central oleodinâmica, freio, maxilas de frenagem e os componentes do quadro de manobra cuja tensão nominal tenha uma tolerância inferior a 5%.'
        ]
    },
    {
        titulo: '3. Exclusões',
        itens: [
            'Reparações por Negligência do Cliente e/ou Terceiros — Estão excluídas do presente contrato as reparações e/ou substituição de peças, bem como a mão-de-obra necessária à execução desses trabalhos, quando resultem de avarias provocadas por uso incorreto ou inadequado, negligência, vandalismo, catástrofes naturais, motivos de força maior, ou por qualquer outra causa fora do controlo da FESTLIFT, Lda. Estes trabalhos não estão incluídos no preço do presente contrato e serão objeto de faturação em separado.',
            'Alterações ao Projeto Inicial — São igualmente excluídos os trabalhos e fornecimentos necessários que tenham como objeto a modificação do projeto inicial, assim como a instalação de novos acessórios e/ou melhorias na instalação, que possam ser solicitadas pelo Cliente ou recomendadas pelas Normas Europeias, Normas Nacionais, Companhias de Seguros, Eletricidade ou Telefones.',
            'Iluminação nos Patamares — São igualmente excluídos dos trabalhos e fornecimentos a instalação e manutenção da iluminação nos patamares de acesso ao(s) elevador(es).',
            'Outras Exclusões — Este contrato de manutenção completa não compreende: a conservação das instalações do edifício, mesmo que executadas especialmente para o estabelecimento dos elevadores (circuitos de força motriz, iluminação, terra, alimentação ao quadro da casa das máquinas e respetiva proteção, dispositivo de antiparasitagem, alvenaria e pintura, ainda que em consequência de trabalhos de reparação); a conservação ou substituição dos elementos decorativos das portas e das cabinas; a reparação ou substituição de peças ou órgãos deteriorados por vandalismo, catástrofes ou uso anormal; alterações de características iniciais, nem a substituição de acessórios por outros de melhores características, assim como alterações por obrigações legais ou administrativas e eventuais exigências das empresas seguradoras; limpeza interior das cabinas, portas e aros; fornecimento de lâmpadas para iluminação da cabine dos elevadores, podendo as mesmas ser disponibilizadas pelo Cliente. O Cliente será responsável pelos custos inerentes às deslocações por chamadas de avarias não justificadas.'
        ]
    },
    {
        titulo: '4. Condições Gerais',
        itens: [
            'Trabalhos em Horário Normal — Todos e quaisquer trabalhos objeto do presente contrato, à exceção do serviço de emergência 24h00, serão efetuados dentro do horário normal de trabalho e apenas nos dias úteis.',
            'Acesso às Instalações — O Cliente, durante a vigência do presente contrato, deverá facilitar o acesso dos técnicos da FESTLIFT, Lda. para que possam efetuar os serviços contratados, e garantir boas condições de segurança nas instalações objeto do presente contrato, bem como nos seus acessos.',
            'Inspeções Periódicas Oficiais — A FESTLIFT, Lda. deverá informar, por escrito, o Cliente em seu devido tempo da necessidade de realização da inspeção periódica, de modo a que este a habilite com o comprovativo do pagamento da taxa respetiva. O envio do requerimento para as Câmaras Municipais é da responsabilidade da FESTLIFT, Lda.',
            'Condições de Segurança — O Cliente fica obrigado a impedir o funcionamento dos elevadores objeto do presente contrato quando tenha conhecimento, direto ou indireto, de que não estão reunidas as devidas condições de segurança e/ou funcionamento.',
            'Intervenção de Terceiros Durante a Vigência do Contrato — O Cliente não deverá, em nenhum caso, permitir que terceiros realizem qualquer tipo de intervenção, reparação e/ou substituição dos componentes do(s) elevador(es) objeto do presente contrato, sem primeiro obter autorização escrita da FESTLIFT, Lda. — podendo, ainda assim, contactar os Bombeiros para desencarceramento de pessoas.',
            'Linha Telefónica (se aplicável o Dec. Lei 295/98) — O Cliente compromete-se à contratação e manutenção de uma linha telefónica necessária ao funcionamento do sistema de comunicação bidirecional. A FESTLIFT, Lda. não se responsabiliza por incumprimentos da Empresa de Telecomunicações, nem por incumprimentos do Cliente para com esta.',
            'Danos e/ou Prejuízos — A FESTLIFT, Lda. não se responsabiliza por perdas, danos ou prejuízos provocados por ações ou ordens das autoridades, greves, incêndios, raios, explosões, terrorismo, guerra, roubo, inundação, danos intencionais ou outras causas de natureza análoga.',
            'Medidas Corretivas por Incumprimento — Em caso de incumprimento por parte da FESTLIFT, Lda. na prestação dos serviços contratados, o Cliente está obrigado a comunicar de forma eficiente e por escrito à FESTLIFT, Lda., com o propósito de serem aplicadas as medidas corretivas adequadas à solução de quaisquer problemas e/ou reclamações.',
            'Prorrogação do Presente Contrato — Chegada a data-termo do presente contrato, este entender-se-á tacitamente prorrogado por igual período. Pode ser rescindido com 60 dias de antecedência se alguma das partes não estiver interessada na sua prorrogação, devendo notificar a contraparte através de carta registada com aviso de receção.',
            'Denúncia do Presente Contrato — Qualquer das partes contratantes poderá, em qualquer momento e sem que exista causa legal que o justifique, denunciar o presente contrato de forma unilateral. Neste caso, a parte que se sinta lesada terá direito a receber a totalidade dos valores devidos até final do contrato, caso este tivesse continuado em vigor.',
            'Liquidação de Valores — O valor indicado no presente contrato será liquidado conforme mencionado nas Condições Particulares. Comprovando-se mora no pagamento de quaisquer quantias devidas à FESTLIFT, Lda. por um período superior a 30 dias, a FESTLIFT, Lda. reserva-se o direito à aplicação de juros à taxa legal em vigor.',
            'Incumprimento dos Pagamentos — O atraso nos pagamentos por parte do Cliente por um período igual ou superior a 60 dias dá o direito à FESTLIFT, Lda. de recusar a prestação de serviços de assistência em caso de avaria, ou de não realizar nenhum tipo de manutenção, podendo optar pela rescisão do contrato e reclamar a indemnização correspondente por danos e prejuízos. Estas atuações serão previamente comunicadas por carta registada com aviso de receção, tanto ao Cliente como às Entidades Oficiais Competentes.',
            'Impostos — No preço indicado no presente contrato não está incluído o IVA, nem qualquer outro imposto existente ou que venha a existir.',
            'Atualização de Preços — O preço estipulado no presente contrato está baseado nos custos de mão-de-obra e materiais vigentes à data de assinatura do mesmo. No início de cada ano, a FESTLIFT, Lda. poderá modificar o preço deste contrato, tomando como base a variação nos últimos 12 meses registada no IPC na categoria de bens e serviços, publicada pelo INE, podendo ainda estabelecer um aumento diferente mediante proposta e respetiva aceitação por parte do Cliente.',
            'Transmissão do Contrato — O presente contrato, os seus direitos e obrigações, podem ser transmitidos a terceiros desde que tal transmissão seja autorizada por escrito pela FESTLIFT, Lda. Até à alienação da última fração, em primeira venda, pelo construtor, este será solidariamente responsável, em parceria com a Administração em exercício, por todas as obrigações contratuais aqui estabelecidas.',
            'Resolução de Questões Judiciais — Para a resolução de quaisquer questões suscitadas pela interpretação, cumprimento ou resolução do presente contrato, as partes acordam competente o foro da Comarca de Lisboa, com expressa renúncia a qualquer outro. Nos casos em que o Cliente, de forma injustificada, resolva o contrato ou se negue à liquidação dos montantes referentes aos serviços realizados pela FESTLIFT, Lda., poder-lhe-ão ser imputadas as despesas daí advenientes, em consequência de reclamação judicial ou extrajudicial.'
        ]
    }
];

module.exports = { CONDICOES_GERAIS_ARTIGOS, CONDICOES_GERAIS_ARTIGOS_COMPLETA };
