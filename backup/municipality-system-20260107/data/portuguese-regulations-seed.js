// Seed data - Португальські норми по ліфтах
// Для наповнення бази даних основними документами

const portugueseRegulations = [
    {
        code: "DL-163/2006",
        title: "Decreto-Lei n.º 163/2006 - Regulamento de Segurança de Ascensores",
        titleEN: "Decree-Law 163/2006 - Elevator Safety Regulation",
        titleUA: "Декрет-Закон 163/2006 - Регламент безпеки ліфтів",
        type: "decree-law",
        category: "safety",
        summary: "Estabelece as regras de segurança aplicáveis aos ascensores instalados em edifícios",
        summaryUA: "Встановлює правила безпеки для ліфтів, встановлених в будівлях",
        fullText: `O presente decreto-lei estabelece:
1. Requisitos de segurança para ascensores novos e existentes
2. Normas de instalação e manutenção
3. Requisitos de inspeção periódica
4. Responsabilidades dos proprietários e operadores`,
        sections: [
            {
                number: "Art. 3",
                title: "Obrigações do proprietário",
                content: "O proprietário do ascensor deve assegurar a manutenção adequada e inspeções periódicas conforme cronograma estabelecido.",
                keywords: ["proprietário", "manutenção", "inspeção", "responsabilidade"],
                relatedArticles: ["Art. 5", "Art. 12"]
            },
            {
                number: "Art. 5",
                title: "Manutenção preventiva",
                content: "A manutenção preventiva deve ser realizada pelo menos mensalmente por empresa certificada.",
                keywords: ["manutenção", "preventiva", "mensal", "certificação"],
                relatedArticles: ["Art. 3", "Art. 8"]
            },
            {
                number: "Art. 8",
                title: "Inspeção anual obrigatória",
                content: "Todo ascensor deve passar por inspeção técnica anual realizada por entidade credenciada.",
                keywords: ["inspeção", "anual", "obrigatória", "credenciamento"],
                relatedArticles: ["Art. 5", "Art. 12"]
            }
        ],
        requirements: [
            {
                id: "DL163-R001",
                description: "Manutenção mensal obrigatória por empresa certificada",
                applies_to: ["passenger-lifts", "cargo-lifts", "residential"],
                severity: "mandatory",
                inspectionCheckpoint: true,
                commonViolations: [
                    "Falta de contrato de manutenção",
                    "Manutenção atrasada",
                    "Empresa não certificada"
                ]
            },
            {
                id: "DL163-R002",
                description: "Inspeção técnica anual obrigatória",
                applies_to: ["passenger-lifts", "cargo-lifts"],
                severity: "mandatory",
                inspectionCheckpoint: true,
                commonViolations: [
                    "Inspeção expirada",
                    "Documentação incompleta"
                ]
            },
            {
                id: "DL163-R003",
                description: "Livro de registo de manutenção atualizado",
                applies_to: ["passenger-lifts", "cargo-lifts", "residential"],
                severity: "mandatory",
                inspectionCheckpoint: true,
                commonViolations: [
                    "Livro não preenchido",
                    "Registos incompletos",
                    "Assinaturas em falta"
                ]
            }
        ],
        keywords: ["segurança", "manutenção", "inspeção", "ascensores", "elevadores"],
        tags: ["segurança", "obrigatório", "inspeção"],
        aiContext: {
            commonQuestions: [
                "Qual a frequência de manutenção obrigatória?",
                "Quem pode fazer a manutenção do elevador?",
                "É obrigatória a inspeção anual?",
                "O que acontece se não fizer a inspeção?"
            ],
            inspectorRemarks: [
                "Contrato de manutenção não apresentado",
                "Livro de manutenção desatualizado",
                "Última inspeção expirada há mais de 30 dias",
                "Empresa de manutenção sem certificação válida"
            ],
            explanations: [
                "A manutenção mensal é obrigatória por lei para garantir o funcionamento seguro do elevador",
                "Apenas empresas certificadas podem realizar manutenção - verifique se seu contrato é com empresa credenciada",
                "A inspeção anual é diferente da manutenção - deve ser feita por entidade independente",
                "O livro de manutenção deve estar sempre na casa de máquinas e atualizado"
            ],
            examples: [
                "Exemplo de conformidade: Contrato com empresa certificada + manutenção mensal registada + inspeção anual válida",
                "Violação comum: Ter apenas manutenção trimestral quando a lei exige mensal"
            ]
        },
        issueDate: new Date("2006-07-01"),
        effectiveDate: new Date("2006-08-01"),
        status: "active",
        availableLanguages: ["pt", "en", "uk"]
    },
    
    {
        code: "EN-81-20:2014",
        title: "EN 81-20:2014 - Regras de segurança para construção e instalação de elevadores",
        titleEN: "EN 81-20:2014 - Safety rules for construction and installation of lifts",
        titleUA: "EN 81-20:2014 - Правила безпеки для конструкції та монтажу ліфтів",
        type: "european-norm",
        category: "installation",
        summary: "Norma europeia que define requisitos de segurança para elevadores de passageiros e cargas",
        summaryUA: "Європейська норма, що визначає вимоги безпеки для пасажирських та вантажних ліфтів",
        sections: [
            {
                number: "5.4",
                title: "Portas de patamar",
                content: "As portas de patamar devem ser resistentes ao fogo e equipadas com fechos de segurança.",
                keywords: ["portas", "patamar", "fogo", "segurança"],
                relatedArticles: ["5.2", "5.7"]
            },
            {
                number: "5.6",
                title: "Dispositivos de proteção contra excesso de velocidade",
                content: "Todo elevador deve ter dispositivo que impede velocidade excessiva na descida.",
                keywords: ["velocidade", "segurança", "dispositivo", "proteção"],
                relatedArticles: ["5.4", "5.12"]
            }
        ],
        requirements: [
            {
                id: "EN81-R001",
                description: "Portas automáticas com sensores de obstáculo",
                applies_to: ["passenger-lifts"],
                severity: "mandatory",
                inspectionCheckpoint: true,
                commonViolations: [
                    "Sensores defeituosos",
                    "Força de fechamento excessiva",
                    "Tempo de reabertura inadequado"
                ]
            },
            {
                id: "EN81-R002",
                description: "Limitador de velocidade funcional",
                applies_to: ["passenger-lifts", "cargo-lifts"],
                severity: "mandatory",
                inspectionCheckpoint: true,
                commonViolations: [
                    "Cabo do limitador desgastado",
                    "Regulação incorreta",
                    "Falta de teste anual"
                ]
            }
        ],
        keywords: ["EN-81", "construção", "instalação", "norma europeia"],
        tags: ["técnico", "construção", "europeu"],
        aiContext: {
            commonQuestions: [
                "O que exige a norma EN 81-20?",
                "Meu elevador antigo precisa cumprir EN 81-20?",
                "Qual diferença entre EN 81-20 e EN 81-50?"
            ],
            inspectorRemarks: [
                "Portas sem proteção contra esmagamento",
                "Limitador de velocidade não testado",
                "Iluminação de emergência insuficiente"
            ],
            explanations: [
                "EN 81-20 é a norma atual para elevadores novos - substituiu a EN 81-1",
                "Elevadores antigos podem seguir norma anterior, mas modernizações devem cumprir EN 81-20",
                "Esta norma é obrigatória em toda União Europeia, incluindo Portugal"
            ]
        },
        issueDate: new Date("2014-09-01"),
        effectiveDate: new Date("2017-09-01"),
        status: "active",
        availableLanguages: ["pt", "en", "uk"]
    },
    
    {
        code: "DL-320/2002",
        title: "Decreto-Lei n.º 320/2002 - Acessibilidade em edifícios",
        titleEN: "Decree-Law 320/2002 - Accessibility in buildings",
        titleUA: "Декрет-Закон 320/2002 - Доступність в будівлях",
        type: "decree-law",
        category: "accessibility",
        summary: "Define normas de acessibilidade, incluindo requisitos para elevadores acessíveis",
        summaryUA: "Визначає норми доступності, включаючи вимоги до доступних ліфтів",
        requirements: [
            {
                id: "DL320-R001",
                description: "Cabine com dimensões mínimas para cadeira de rodas (1,10m x 1,40m)",
                applies_to: ["passenger-lifts", "residential"],
                severity: "mandatory",
                inspectionCheckpoint: true,
                commonViolations: [
                    "Cabine muito pequena",
                    "Porta estreita (mínimo 80cm)"
                ]
            },
            {
                id: "DL320-R002",
                description: "Botoeira com braile e sinais sonoros",
                applies_to: ["passenger-lifts"],
                severity: "mandatory",
                inspectionCheckpoint: true,
                commonViolations: [
                    "Falta de braile nos botões",
                    "Sem confirmação sonora",
                    "Altura inadequada dos botões"
                ]
            }
        ],
        keywords: ["acessibilidade", "deficientes", "cadeira de rodas", "braile"],
        tags: ["acessibilidade", "inclusão"],
        aiContext: {
            commonQuestions: [
                "Meu elevador precisa ser acessível?",
                "Quais as dimensões mínimas para acessibilidade?",
                "É obrigatório ter braile nos botões?"
            ],
            inspectorRemarks: [
                "Cabine não comporta cadeira de rodas",
                "Botões sem identificação em braile",
                "Falta de sinalização sonora"
            ],
            explanations: [
                "Edifícios públicos e novos edifícios residenciais devem ter elevadores acessíveis",
                "Cabine deve ter pelo menos 1,10m x 1,40m para permitir manobra de cadeira de rodas",
                "Botões devem ter braile e estar a altura acessível (90cm-120cm do chão)"
            ]
        },
        issueDate: new Date("2002-11-15"),
        effectiveDate: new Date("2003-01-01"),
        status: "active",
        availableLanguages: ["pt", "uk"]
    },
    
    {
        code: "PORTARIA-1276/2002",
        title: "Portaria n.º 1276/2002 - Regras de instalação de elevadores",
        titleEN: "Ordinance 1276/2002 - Elevator installation rules",
        titleUA: "Постанова 1276/2002 - Правила встановлення ліфтів",
        type: "ordinance",
        category: "installation",
        summary: "Regulamenta procedimentos de instalação e homologação de elevadores",
        summaryUA: "Регулює процедури встановлення та сертифікації ліфтів",
        requirements: [
            {
                id: "PORT1276-R001",
                description: "Projeto técnico aprovado antes da instalação",
                applies_to: ["passenger-lifts", "cargo-lifts"],
                severity: "mandatory",
                inspectionCheckpoint: true,
                commonViolations: [
                    "Instalação sem projeto aprovado",
                    "Alterações não documentadas"
                ]
            }
        ],
        keywords: ["instalação", "projeto", "homologação"],
        tags: ["instalação", "procedimentos"],
        aiContext: {
            commonQuestions: [
                "Preciso de aprovação para instalar elevador?",
                "Quanto tempo demora a aprovação do projeto?"
            ],
            inspectorRemarks: [
                "Projeto técnico não apresentado",
                "Instalação não conforme ao projeto"
            ],
            explanations: [
                "Todo elevador novo precisa de projeto técnico aprovado antes da instalação",
                "O projeto deve ser elaborado por técnico habilitado"
            ]
        },
        issueDate: new Date("2002-10-22"),
        effectiveDate: new Date("2002-11-01"),
        status: "active",
        availableLanguages: ["pt", "uk"]
    },
    
    {
        code: "EN-81-50:2014",
        title: "EN 81-50:2014 - Exame e testes de elevadores",
        titleEN: "EN 81-50:2014 - Examination and tests of lifts",
        titleUA: "EN 81-50:2014 - Огляд та випробування ліфтів",
        type: "european-norm",
        category: "inspection",
        summary: "Define procedimentos para inspeção e testes de elevadores",
        summaryUA: "Визначає процедури огляду та випробування ліфтів",
        requirements: [
            {
                id: "EN81-50-R001",
                description: "Teste de limitador de velocidade anual",
                applies_to: ["passenger-lifts", "cargo-lifts"],
                severity: "mandatory",
                inspectionCheckpoint: true,
                commonViolations: [
                    "Teste não realizado",
                    "Documentação do teste incompleta"
                ]
            },
            {
                id: "EN81-50-R002",
                description: "Verificação de amortecedores",
                applies_to: ["passenger-lifts", "cargo-lifts"],
                severity: "mandatory",
                inspectionCheckpoint: true,
                commonViolations: [
                    "Amortecedores desgastados",
                    "Nível de óleo baixo (amortecedores hidráulicos)"
                ]
            }
        ],
        keywords: ["inspeção", "testes", "verificação", "procedimentos"],
        tags: ["inspeção", "testes", "técnico"],
        aiContext: {
            commonQuestions: [
                "Que testes são obrigatórios na inspeção?",
                "Com que frequência testar o limitador de velocidade?",
                "Quem pode fazer os testes?"
            ],
            inspectorRemarks: [
                "Teste de limitador não documentado",
                "Amortecedores com defeito",
                "Falta de teste de portas"
            ],
            explanations: [
                "EN 81-50 define COMO fazer inspeções - complementa normas que dizem O QUE inspecionar",
                "Limitador de velocidade deve ser testado anualmente sob carga",
                "Apenas técnicos certificados podem realizar testes oficiais"
            ]
        },
        issueDate: new Date("2014-09-01"),
        effectiveDate: new Date("2017-09-01"),
        status: "active",
        availableLanguages: ["pt", "en", "uk"]
    }
];

module.exports = portugueseRegulations;
