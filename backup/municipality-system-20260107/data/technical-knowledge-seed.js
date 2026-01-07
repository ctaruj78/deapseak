// data/technical-knowledge-seed.js
// Розширена технічна база знань для AI асистента

const technicalKnowledge = {
    
    // ==================== КОДИ ПОМИЛОК (DESPACHOS) ====================
    errorCodes: [
        {
            code: "E01",
            name: "Erro de sobrecarga",
            nameUA: "Помилка перевантаження",
            description: "Elevador detectou peso acima do permitido",
            symptoms: [
                "Portas não fecham",
                "Alarme sonoro contínuo",
                "Display mostra E01",
                "Cabine não se move"
            ],
            causes: [
                "Peso real excede capacidade (ex: 630kg em elevador de 600kg)",
                "Sensor de carga defeituoso",
                "Calibração incorreta do sistema de pesagem",
                "Acumulação de sujidade no sensor"
            ],
            diagnostics: [
                "1. Verificar display: se mostra peso atual",
                "2. Pedir todos a saírem da cabine",
                "3. Testar vazio - se erro persiste → sensor defeituoso",
                "4. Verificar fiação do sensor de carga (geralmente 4 fios)"
            ],
            solutions: [
                {
                    priority: "immediate",
                    description: "Reduzir número de pessoas/carga na cabine",
                    cost: "€0",
                    time: "1 minuto"
                },
                {
                    priority: "urgent",
                    description: "Recalibrar sensor de carga",
                    cost: "€80-120",
                    time: "30-45 min",
                    requiredParts: ["kit-calibracao-carga"],
                    steps: [
                        "Aceder ao quadro de comando",
                        "Menu → Configuração → Carga",
                        "Zerar com cabine vazia",
                        "Colocar peso conhecido (ex: 100kg)",
                        "Ajustar até display mostrar correto"
                    ]
                },
                {
                    priority: "planned",
                    description: "Substituir célula de carga",
                    cost: "€200-350",
                    time: "2-3 horas",
                    requiredParts: ["celula-carga-generico", "cabo-sensor-4vias"],
                    tools: ["multimetro", "chave-allen-set", "alicate-crimpagem"]
                }
            ],
            relatedRegulations: ["EN-81-20:2014"],
            preventiveMaintenance: "Limpeza mensal do sensor, calibração semestral",
            urgencyLevel: "medium"
        },
        
        {
            code: "E04",
            name: "Falha no limitador de velocidade",
            nameUA: "Відмова обмежувача швидкості",
            description: "Sistema de segurança detectou velocidade excessiva",
            symptoms: [
                "Elevador para abruptamente",
                "Impossível mover após paragem",
                "Luz de emergência acende",
                "Display: E04 ou ER-SPEED"
            ],
            causes: [
                "Cabo do limitador descarrilou da polia",
                "Polia do limitador bloqueada (sujidade/corrosão)",
                "Interruptor de segurança acionado",
                "Velocidade real excedeu 115% da nominal",
                "Defeito no encoder de velocidade"
            ],
            diagnostics: [
                "1. IR À CASA DE MÁQUINAS - nunca tentar dentro da cabine!",
                "2. Verificar visualmente polia do limitador - cabo está no trilho?",
                "3. Verificar interruptor de segurança - luz vermelha acesa?",
                "4. Girar polia manualmente - gira livre ou travada?",
                "5. Verificar tensão do cabo (deve ter pequena folga, não frouxo)"
            ],
            solutions: [
                {
                    priority: "immediate",
                    description: "CHAMAR TÉCNICO CERTIFICADO - não tentar resolver sozinho!",
                    cost: "€150-300",
                    time: "1-2 horas",
                    warning: "⚠️ Sistema de segurança! Só técnico certificado pode resetar!"
                },
                {
                    priority: "urgent",
                    description: "Reposicionar cabo do limitador (técnico)",
                    cost: "€120-200",
                    time: "45-60 min",
                    steps: [
                        "Desligar alimentação elétrica PRINCIPAL",
                        "Reposicionar cabo na polia",
                        "Verificar tensionador do cabo",
                        "Testar rotação manual",
                        "Resetar interruptor de segurança",
                        "Teste de funcionamento em vazio",
                        "Teste com carga"
                    ]
                },
                {
                    priority: "planned",
                    description: "Substituir cabo do limitador (desgaste)",
                    cost: "€300-600",
                    time: "3-4 horas",
                    requiredParts: ["cabo-limitador-6mm", "terminal-cabo", "lubrificante-cabo"],
                    regulation: "EN-81-50:2014 exige teste anual do limitador"
                }
            ],
            relatedRegulations: ["EN-81-20:2014", "EN-81-50:2014"],
            preventiveMaintenance: "Inspeção mensal, lubrificação trimestral, teste anual obrigatório",
            urgencyLevel: "critical",
            safetyNote: "⚠️ CRÍTICO: Nunca bypassar este sistema! É proteção contra queda!"
        },
        
        {
            code: "E07",
            name: "Erro de portas",
            nameUA: "Помилка дверей",
            description: "Sistema não consegue fechar portas completamente",
            symptoms: [
                "Portas abrem e fecham repetidamente",
                "Tentam fechar mas voltam abrir",
                "Alarme sonoro intermitente",
                "Display: E07, DOOR ERROR"
            ],
            causes: [
                "Obstáculo na soleira (pedra, sujidade, objeto)",
                "Desalinhamento das portas (folgas incorretas)",
                "Sensor fotocélula sujo ou desalinhado",
                "Batente da porta desgastado",
                "Motor da porta fraco (correia gasta)",
                "Calha da porta suja ou deformada"
            ],
            diagnostics: [
                "1. PRIMEIRO: Verificar visualmente - há algo bloqueando?",
                "2. Limpar soleira com escova",
                "3. Passar mão pela fotocélula - limpar com pano",
                "4. Observar fechamento - portas encostam completamente?",
                "5. Ouvir motor - faz ruído de esforço?",
                "6. Verificar folga - deve ter 3-5mm quando fechada"
            ],
            solutions: [
                {
                    priority: "immediate",
                    description: "Limpar soleira e fotocélula",
                    cost: "€0",
                    time: "5 minutos",
                    diy: true,
                    steps: [
                        "Remover sujidade da soleira com escova",
                        "Limpar fotocélula com pano seco",
                        "Verificar se não há pedras pequenas",
                        "Testar fechamento"
                    ]
                },
                {
                    priority: "urgent",
                    description: "Ajustar alinhamento das portas",
                    cost: "€60-100",
                    time: "30 minutos",
                    requiredParts: [],
                    tools: ["nivel-laser", "chave-allen-6mm", "fita-metrica"]
                },
                {
                    priority: "urgent",
                    description: "Substituir fotocélula",
                    cost: "€45-80",
                    time: "20 minutos",
                    requiredParts: ["fotcelula-infravermelhos"],
                    partNumbers: ["FC-IR-24V", "OPTEX-FA3"]
                },
                {
                    priority: "planned",
                    description: "Substituir correia do motor",
                    cost: "€80-150",
                    time: "1 hora",
                    requiredParts: ["correia-portas-dentada"],
                    symptoms: "Motor faz ruído, portas fecham devagar"
                }
            ],
            relatedRegulations: ["EN-81-20:2014"],
            preventiveMaintenance: "Limpeza mensal, lubrificação trimestral das calhas",
            urgencyLevel: "high"
        },
        
        {
            code: "E12",
            name: "Falta de fase / erro elétrico",
            nameUA: "Відсутність фази / електрична помилка",
            description: "Sistema detectou problema na alimentação elétrica",
            symptoms: [
                "Elevador totalmente parado",
                "Luzes internas apagadas ou piscando",
                "Display apagado ou mostra E12",
                "Quadro elétrico com relé a fazer 'clique' repetido"
            ],
            causes: [
                "Falta de uma fase (linha trifásica)",
                "Disjuntor desarmado",
                "Fusível queimado",
                "Cabo de alimentação solto",
                "Problema na rede elétrica do edifício",
                "Contactores defeituosos"
            ],
            diagnostics: [
                "1. Verificar quadro geral do edifício - disjuntores ON?",
                "2. Verificar quadro do elevador - há luzes acesas?",
                "3. Multímetro: medir tensão L1-L2-L3 (deve ter 400V trifásico)",
                "4. Verificar se todas 3 fases têm tensão",
                "5. Ouvir relés - fazem clique contínuo? → falta fase"
            ],
            solutions: [
                {
                    priority: "immediate",
                    description: "Verificar e ligar disjuntor",
                    cost: "€0",
                    time: "2 minutos",
                    diy: true,
                    steps: [
                        "Ir ao quadro elétrico principal",
                        "Procurar disjuntor do elevador (geralmente 25-32A)",
                        "Se desligado, ligar",
                        "Se desarma novamente → problema mais grave"
                    ]
                },
                {
                    priority: "urgent",
                    description: "Substituir fusível queimado",
                    cost: "€15-30",
                    time: "15 minutos",
                    requiredParts: ["fusivel-32A-gG"],
                    warning: "Desligar alimentação antes de substituir!"
                },
                {
                    priority: "urgent",
                    description: "Chamar eletricista - problema na rede",
                    cost: "€100-200",
                    time: "1-2 horas",
                    when: "Se disjuntor desarma repetidamente"
                },
                {
                    priority: "planned",
                    description: "Substituir contactores",
                    cost: "€120-250",
                    time: "1.5 horas",
                    requiredParts: ["contactor-tripolar-25A"],
                    partNumbers: ["LC1D25", "DILM25"]
                }
            ],
            relatedRegulations: ["DL-163/2006"],
            preventiveMaintenance: "Inspeção elétrica semestral, aperto de bornes anual",
            urgencyLevel: "critical"
        },
        
        {
            code: "E20",
            name: "Elevador não nivela",
            nameUA: "Ліфт не рівнює з поверхом",
            description: "Cabine para alguns centímetros acima ou abaixo do piso",
            symptoms: [
                "Degrau entre cabine e piso (5-15cm)",
                "Display mostra andar correto mas posição errada",
                "Portas abrem mas há desnível perigoso"
            ],
            causes: [
                "Encoder de posição descalibrado",
                "Desgaste nos cabos de tração (alongamento)",
                "Sapatas de freio gastas ou desajustadas",
                "Roldanas guia desgastadas",
                "Sistema de nivelamento defeituoso"
            ],
            diagnostics: [
                "1. Medir desnível com fita métrica - quantos cm?",
                "2. Verificar se erro é sempre no mesmo andar ou varia",
                "3. Testar nivelamento em vazio vs com carga",
                "4. Se erro aumenta com carga → cabos alongados",
                "5. Se erro aleatório → encoder descalibrado"
            ],
            solutions: [
                {
                    priority: "urgent",
                    description: "Recalibrar encoder de posição",
                    cost: "€100-180",
                    time: "45-60 min",
                    steps: [
                        "Mover cabine manualmente ao piso referência",
                        "Quadro de comando → Reset posição",
                        "Executar auto-aprendizagem de pisos",
                        "Testar todos os andares"
                    ]
                },
                {
                    priority: "urgent",
                    description: "Ajustar freio mecânico",
                    cost: "€80-150",
                    time: "40 min",
                    requiredParts: ["sapatas-freio-elevador"],
                    regulation: "EN-81-20 exige teste de freio semestral"
                },
                {
                    priority: "planned",
                    description: "Substituir cabos de tração",
                    cost: "€800-1500",
                    time: "1 dia inteiro",
                    requiredParts: ["cabo-aco-8mm-6x19"],
                    when: "Se cabos têm >10 anos ou alongamento >2%",
                    warning: "⚠️ Trabalho complexo - elevador parado 1 dia"
                }
            ],
            relatedRegulations: ["EN-81-20:2014", "EN-81-50:2014"],
            preventiveMaintenance: "Verificação mensal do nivelamento, ajuste trimestral",
            urgencyLevel: "high",
            safetyNote: "⚠️ Desnível >3cm é perigoso - risco de tropeção!"
        }
    ],
    
    // ==================== CATÁLOGO DE PEÇAS (ARTIGOS) ====================
    spareParts: [
        {
            partNumber: "FC-IR-24V",
            name: "Fotocélula infravermelhos 24V",
            nameUA: "Фотоелемент інфрачервоний 24В",
            category: "sensores",
            manufacturer: "Genérico",
            compatibleWith: [
                "Portas automáticas padrão",
                "Sistemas VVVF",
                "Quadros Schneider, Siemens"
            ],
            price: "€45-65",
            deliveryTime: "24-48h",
            alternativeParts: ["OPTEX-FA3", "SICK-WL4"],
            installation: {
                difficulty: "fácil",
                time: "15-20 min",
                tools: ["chave-fendas", "multimetro"],
                steps: [
                    "Desligar alimentação 24V",
                    "Remover fotocélula antiga (2 parafusos)",
                    "Conectar fios: Marrom=+24V, Azul=0V, Preto=Sinal",
                    "Alinhar emissor e recetor (LED verde deve acender)",
                    "Testar obstrução com mão"
                ]
            },
            commonIssues: [
                "LED não acende → verificar alimentação 24V",
                "Portas não fecham → desalinhamento emissor/recetor",
                "Funciona intermitente → lente suja ou sol direto"
            ]
        },
        
        {
            partNumber: "LC1D25",
            name: "Contactor tripolar 25A Schneider",
            nameUA: "Контактор триполюсний 25А Schneider",
            category: "componentes-eletricos",
            manufacturer: "Schneider Electric",
            compatibleWith: [
                "Quadros de comando trifásicos",
                "Motores até 11kW",
                "Tensão bobina: 230V AC"
            ],
            price: "€85-120",
            deliveryTime: "24h (stock local)",
            alternativeParts: ["DILM25 (Moeller)", "3RT1026 (Siemens)"],
            technicalSpecs: {
                voltage: "230V AC (bobina)",
                current: "25A",
                poles: 3,
                auxiliaryContacts: "1NO + 1NC",
                lifetime: "10 milhões operações mecânicas"
            },
            installation: {
                difficulty: "média",
                time: "30-40 min",
                tools: ["chave-fendas", "multimetro", "alicate"],
                requiredKnowledge: "Eletricista qualificado",
                steps: [
                    "⚠️ DESLIGAR ALIMENTAÇÃO PRINCIPAL!",
                    "Fotografar ligações antigas",
                    "Soltar fios de potência (L1, L2, L3)",
                    "Soltar bobina (A1, A2)",
                    "Montar novo contactor no trilho DIN",
                    "Religar seguindo fotografia",
                    "Verificar aperto dos terminais",
                    "Testar continuidade com multímetro",
                    "Ligar alimentação e testar"
                ]
            },
            symptoms: [
                "Elevador não arranca → contactor não fecha",
                "Ruído de vibração → núcleo magnético sujo",
                "Cheiro a queimado → contactos soldados"
            ],
            diagnostics: "Medir tensão bobina (deve ter 230V), verificar se núcleo move livremente"
        },
        
        {
            partNumber: "ENC-ROT-1024",
            name: "Encoder rotativo 1024 pulsos",
            nameUA: "Енкодер обертальний 1024 імпульсів",
            category: "sensores",
            manufacturer: "Heidenhain / Genérico",
            compatibleWith: [
                "Sistemas de nivelamento",
                "Inversores VVVF",
                "Quadros com entrada encoder"
            ],
            price: "€180-280",
            deliveryTime: "3-5 dias",
            technicalSpecs: {
                pulses: "1024 PPR",
                voltage: "5-24V DC",
                output: "Diferencial RS422",
                shaft: "Ø10mm",
                protection: "IP65"
            },
            installation: {
                difficulty: "média-alta",
                time: "1-1.5 horas",
                tools: ["chave-allen", "acoplamento-flexivel", "multimetro"],
                criticalSteps: [
                    "Alinhar eixo perfeitamente (usar acoplamento flexível)",
                    "Não forçar eixo - encoder é delicado!",
                    "Blindar cabos - interferência eletromagnética comum"
                ],
                calibration: "Após instalar, executar auto-aprendizagem no quadro"
            },
            commonIssues: [
                "Nivelamento errático → cabo mal blindado ou interferência",
                "Sem sinal → verificar alimentação 24V e ligação terra",
                "Erro de posição → eixo desalinhado ou acoplamento frouxo"
            ]
        },
        
        {
            partNumber: "CABO-TRAÇÃO-8MM",
            name: "Cabo de aço tração 8mm 6x19",
            nameUA: "Трос сталевий тяговий 8мм 6x19",
            category: "cabos",
            manufacturer: "Diversos (certificado EN)",
            specifications: "Aço galvanizado, 6 pernas x 19 fios, alma têxtil",
            price: "€8-12 por metro",
            minimumOrder: "20 metros (jogo completo)",
            deliveryTime: "5-7 dias (corte e terminais)",
            installation: {
                difficulty: "muito-alta",
                time: "1 dia completo (8h)",
                team: "2 técnicos certificados",
                equipmentRequired: [
                    "Talha manual",
                    "Ferramenta crimpagem terminais",
                    "Lubrificante específico cabos",
                    "EPI completo"
                ],
                warning: "⚠️ TRABALHO PERIGOSO - Só empresa certificada!"
            },
            inspection: {
                frequency: "Mensal (visual), Semestral (medição)",
                criteria: [
                    "Fios partidos: máximo 10% numa perna",
                    "Desgaste diâmetro: máximo 10% (8mm → mínimo 7.2mm)",
                    "Corrosão: nenhuma visível",
                    "Alongamento: máximo 2% do comprimento original"
                ],
                replacement: "Obrigatório se qualquer critério excedido"
            },
            regulation: "EN-81-20 art. 5.5 - testes de cabos obrigatórios",
            safetyNote: "⚠️ CRÍTICO: Cabo é componente de segurança! Nunca adiar substituição!"
        }
    ],
    
    // ==================== FERRAMENTAS DIAGNÓSTICO ====================
    diagnosticTools: [
        {
            name: "Multímetro Digital",
            nameUA: "Мультиметр цифровий",
            essential: true,
            price: "€25-80",
            uses: [
                "Medir tensão AC/DC (verificar alimentação)",
                "Medir continuidade (verificar fios partidos)",
                "Medir resistência (testar bobinas, motores)",
                "Testar díodos e transístores"
            ],
            howToUse: {
                "Testar alimentação": "Posição V~ (AC), tocar nas fases L1-L2 → deve mostrar ~400V",
                "Testar sensor": "Posição V- (DC), tocar nos fios sensor → deve mostrar 24V",
                "Testar continuidade": "Posição buzzer, tocar nos extremos do fio → bip se OK"
            }
        },
        {
            name: "Chave de teste de tensão",
            nameUA: "Індикатор напруги",
            essential: true,
            price: "€5-15",
            uses: [
                "Verificar se há tensão SEM TOCAR",
                "Segurança antes de trabalhar em quadro"
            ],
            safetyNote: "⚠️ SEMPRE usar ANTES de tocar em qualquer fio!"
        }
    ]
};

module.exports = technicalKnowledge;
