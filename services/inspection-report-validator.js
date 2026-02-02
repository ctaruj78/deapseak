/**
 * Inspection Report Validator
 * ============================
 * 
 * Valida relatórios de inspeção conforme Circular IPAC 06/2025
 * 
 * DESCRITORES INVÁLIDOS que NÃO devem aparecer em resultados:
 * - "A instalação sofreu uma remodelação importante não tendo sido apresentada 
 *    declaração de conformidade emitida por um organismo competente"
 * - "A instalação sofreu uma remodelação importante e não existem indícios de 
 *    que tenha sido realizada uma avaliação por um organismo competente"
 * 
 * Rationale (IPAC 06/2025):
 * "A verificação dos documentos indicados nos exemplos não constitui uma ação 
 *  a executar no contexto de inspeção periódica, nem a competência das EIIE 
 *  passa pela confirmação da atuação de outras entidades intervenientes."
 * 
 * @implements Circular IPAC N.º 6/2025
 */

class InspectionReportValidator {
    constructor() {
        // Descritores proibidos conforme Circular IPAC 06/2025
        this.invalidDescriptors = [
            {
                pattern: /remodelação.*importante.*não.*apresentad[ao].*declaração.*conformidade/i,
                code: 'INVALID_DESC_01',
                description: 'Resultado baseado em ausência de declaração de conformidade de modificação',
                reason: 'Não é competência da EIIE verificar documentos de outras entidades',
                severity: 'error',
                reference: 'Circular IPAC 06/2025'
            },
            {
                pattern: /remodelação.*importante.*não.*indícios.*avaliação.*organismo/i,
                code: 'INVALID_DESC_02',
                description: 'Resultado baseado em ausência de avaliação por organismo competente',
                reason: 'Não é competência da EIIE confirmar atuação de outras entidades',
                severity: 'error',
                reference: 'Circular IPAC 06/2025'
            },
            {
                pattern: /modificação.*não.*declaração.*conformidade.*emitida/i,
                code: 'INVALID_DESC_03',
                description: 'Resultado baseado em falta de documentação de modificação',
                reason: 'Verificação de documentos não faz parte da inspeção periódica',
                severity: 'error',
                reference: 'Circular IPAC 06/2025'
            },
            {
                pattern: /recusa.*inspeção.*falta.*documentação/i,
                code: 'INVALID_DESC_04',
                description: 'Recusa de inspeção por falta de documentação',
                reason: 'EIIE não pode recusar inspeção por falta de documentos de outras entidades',
                severity: 'critical',
                reference: 'Circular IPAC 06/2025'
            },
            {
                pattern: /falta.*documentação.*prevista.*circular.*dgeg/i,
                code: 'INVALID_DESC_05',
                description: 'Deficiência baseada em falta de documentação DGEG',
                reason: 'Verificação de documentos de circulares DGEG não é parte da inspeção periódica',
                severity: 'error',
                reference: 'Circular IPAC 06/2025',
                example: 'GATECI RP04748 - Circular nº 1-2010-DSL-EL'
            },
            {
                pattern: /não.*apresenta.*documentação.*circular/i,
                code: 'INVALID_DESC_06',
                description: 'Não conformidade baseada em ausência de documentos de circular',
                reason: 'Competência de verificação documental não pertence à EIIE',
                severity: 'error',
                reference: 'Circular IPAC 06/2025'
            }
        ];

        // Padrões válidos para observações (não para resultados)
        this.validObservationPatterns = [
            {
                pattern: /observação.*modificação.*ausência.*documentação/i,
                type: 'modification_documentation',
                isValid: true,
                note: 'Válido como observação, não como resultado'
            }
        ];
    }

    /**
     * Validar relatório de inspeção
     */
    validateReport(report) {
        const errors = [];
        const warnings = [];
        const observations = [];

        // 1. Validar resultado da inspeção
        if (report.result && report.result.description) {
            const resultValidation = this.validateResultDescription(report.result.description);
            errors.push(...resultValidation.errors);
            warnings.push(...resultValidation.warnings);
        }

        // 2. Validar descritores de não conformidades
        if (report.non_conformities) {
            report.non_conformities.forEach((nc, index) => {
                const ncValidation = this.validateNonConformityDescription(nc, index);
                errors.push(...ncValidation.errors);
                warnings.push(...ncValidation.warnings);
            });
        }

        // 3. Validar observações (permitidas)
        if (report.observations) {
            report.observations.forEach((obs, index) => {
                const obsValidation = this.validateObservation(obs, index);
                observations.push(...obsValidation.suggestions);
            });
        }

        // 4. Verificar se especificação de inspeção foi identificada
        if (!report.inspection_specification) {
            warnings.push({
                code: 'MISSING_SPEC',
                field: 'inspection_specification',
                message: 'Especificação de inspeção não identificada',
                recommendation: 'Conforme Circular IPAC 06/2025, deve identificar diploma aplicável',
                severity: 'warning'
            });
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            observations: observations,
            summary: {
                totalErrors: errors.length,
                totalWarnings: warnings.length,
                criticalErrors: errors.filter(e => e.severity === 'critical').length
            }
        };
    }

    /**
     * Validar descrição do resultado
     */
    validateResultDescription(description) {
        const errors = [];
        const warnings = [];

        // Verificar padrões inválidos
        for (const invalid of this.invalidDescriptors) {
            if (invalid.pattern.test(description)) {
                errors.push({
                    code: invalid.code,
                    field: 'result.description',
                    message: `Descritor inválido detectado: ${invalid.description}`,
                    reason: invalid.reason,
                    severity: invalid.severity,
                    reference: invalid.reference,
                    foundText: description.match(invalid.pattern)[0],
                    recommendation: 'Remover este descritor do resultado. Pode ser incluído como observação se apropriado.'
                });
            }
        }

        return { errors, warnings };
    }

    /**
     * Validar descrição de não conformidade
     */
    validateNonConformityDescription(nonConformity, index) {
        const errors = [];
        const warnings = [];

        if (!nonConformity.description) {
            return { errors, warnings };
        }

        // Verificar padrões inválidos
        for (const invalid of this.invalidDescriptors) {
            if (invalid.pattern.test(nonConformity.description)) {
                errors.push({
                    code: invalid.code,
                    field: `non_conformities[${index}].description`,
                    message: `Descritor inválido em não conformidade #${index + 1}`,
                    reason: invalid.reason,
                    severity: invalid.severity,
                    reference: invalid.reference,
                    foundText: nonConformity.description.match(invalid.pattern)[0],
                    recommendation: 'Esta não conformidade deve ser removida ou movida para observações.'
                });
            }
        }

        // Verificar se há especificação técnica referenciada
        if (!nonConformity.regulation_reference && !nonConformity.technical_requirement) {
            warnings.push({
                code: 'MISSING_REF',
                field: `non_conformities[${index}].regulation_reference`,
                message: `Não conformidade #${index + 1} sem referência regulamentar`,
                recommendation: 'Incluir referência ao diploma/norma aplicável',
                severity: 'warning'
            });
        }

        return { errors, warnings };
    }

    /**
     * Validar observação
     */
    validateObservation(observation, index) {
        const suggestions = [];

        if (!observation.text) {
            return { suggestions };
        }

        // Verificar se é observação válida sobre modificação
        for (const valid of this.validObservationPatterns) {
            if (valid.pattern.test(observation.text)) {
                suggestions.push({
                    code: 'VALID_OBS',
                    field: `observations[${index}]`,
                    type: valid.type,
                    message: 'Observação adequada conforme Circular IPAC 06/2025',
                    note: valid.note,
                    severity: 'info'
                });
            }
        }

        return { suggestions };
    }

    /**
     * Sugerir correção para descritor inválido
     */
    suggestCorrection(invalidDescriptorCode, originalText) {
        const suggestions = {
            'INVALID_DESC_01': {
                action: 'move_to_observations',
                correctedText: `OBSERVAÇÃO: A instalação apresenta sinais de modificação importante. Recomenda-se que o proprietário obtenha documentação adequada de organismo competente.`,
                explanation: 'Convertido de resultado para observação'
            },
            'INVALID_DESC_02': {
                action: 'move_to_observations',
                correctedText: `OBSERVAÇÃO: A instalação aparenta ter sofrido modificação importante. Ausência de documentação de avaliação por organismo competente.`,
                explanation: 'Convertido de resultado para observação'
            },
            'INVALID_DESC_03': {
                action: 'move_to_observations',
                correctedText: `OBSERVAÇÃO: Modificação identificada sem declaração de conformidade disponível. Recomenda-se regularização documental.`,
                explanation: 'Convertido de resultado para observação'
            },
            'INVALID_DESC_04': {
                action: 'remove',
                correctedText: null,
                explanation: 'Recusa de inspeção não permitida. Proceder com inspeção técnica normalmente.'
            },
            'INVALID_DESC_05': {
                action: 'move_to_observations',
                correctedText: `OBSERVAÇÃO: A instalação não apresenta a documentação prevista na Circular DGEG. Recomenda-se ao proprietário regularizar a situação junto da DGEG.`,
                explanation: 'Documentação de circulares DGEG não é deficiência técnica - convertido para observação'
            },
            'INVALID_DESC_06': {
                action: 'move_to_observations',
                correctedText: `OBSERVAÇÃO: Ausência de documentação referente a circular. Recomenda-se regularização junto da entidade competente.`,
                explanation: 'Verificação documental não é competência da EIIE - convertido para observação'
            }
        };

        return suggestions[invalidDescriptorCode] || null;
    }

    /**
     * Auto-corrigir relatório (se possível)
     */
    autoCorrectReport(report, validationResult) {
        const correctedReport = JSON.parse(JSON.stringify(report)); // Deep clone
        const corrections = [];

        for (const error of validationResult.errors) {
            if (error.severity === 'critical') {
                // Erros críticos não podem ser auto-corrigidos
                continue;
            }

            const suggestion = this.suggestCorrection(error.code, error.foundText);
            
            if (suggestion) {
                if (suggestion.action === 'move_to_observations') {
                    // Mover para observações
                    if (!correctedReport.observations) {
                        correctedReport.observations = [];
                    }

                    correctedReport.observations.push({
                        text: suggestion.correctedText,
                        type: 'modification_documentation',
                        auto_generated: true,
                        source: 'Auto-correction per Circular IPAC 06/2025'
                    });

                    corrections.push({
                        type: 'moved_to_observation',
                        from: error.field,
                        original: error.foundText,
                        corrected: suggestion.correctedText
                    });
                }

                if (suggestion.action === 'remove') {
                    corrections.push({
                        type: 'removed',
                        from: error.field,
                        original: error.foundText,
                        reason: suggestion.explanation
                    });
                }
            }
        }

        return {
            correctedReport,
            corrections,
            requiresManualReview: validationResult.summary.criticalErrors > 0
        };
    }
}

module.exports = InspectionReportValidator;
