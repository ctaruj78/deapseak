/**
 * IPAC 06/2025 Validator Integration for Frontend
 * ================================================
 * Client-side validator for inspection reports
 * Implements Circular IPAC N.º 6/2025 requirements
 */

class IPACValidator {
    constructor() {
        this.invalidDescriptors = [
            {
                pattern: /remodelação.*importante.*não.*apresentad[ao].*declaração.*conformidade/i,
                code: 'INVALID_DESC_01',
                description: 'Resultado baseado em ausência de declaração de conformidade de modificação',
                severity: 'error'
            },
            {
                pattern: /remodelação.*importante.*não.*indícios.*avaliação.*organismo/i,
                code: 'INVALID_DESC_02',
                description: 'Resultado baseado em ausência de avaliação por organismo competente',
                severity: 'error'
            },
            {
                pattern: /modificação.*não.*declaração.*conformidade.*emitida/i,
                code: 'INVALID_DESC_03',
                description: 'Resultado baseado em falta de documentação de modificação',
                severity: 'error'
            },
            {
                pattern: /recusa.*inspeção.*falta.*documentação/i,
                code: 'INVALID_DESC_04',
                description: 'Recusa de inspeção por falta de documentação',
                severity: 'critical'
            },
            {
                pattern: /falta.*documentação.*prevista.*circular.*dgeg/i,
                code: 'INVALID_DESC_05',
                description: 'Deficiência baseada em falta de documentação DGEG',
                severity: 'error'
            },
            {
                pattern: /não.*apresenta.*documentação.*circular/i,
                code: 'INVALID_DESC_06',
                description: 'Não conformidade baseada em ausência de documentos de circular',
                severity: 'error'
            }
        ];
    }

    /**
     * Validate a single violation
     */
    validateViolation(violation) {
        const errors = [];
        const warnings = [];

        if (!violation.description) {
            return { valid: true, errors, warnings };
        }

        // Check for invalid descriptors
        for (const invalid of this.invalidDescriptors) {
            if (invalid.pattern.test(violation.description)) {
                errors.push({
                    code: invalid.code,
                    type: violation.classification || 'Unknown',
                    article: violation.article || 'Unknown',
                    message: invalid.description,
                    severity: invalid.severity,
                    foundText: violation.description,
                    recommendation: 'Esta deficiência deve ser convertida em OBSERVAÇÃO conforme Circular IPAC 06/2025'
                });
            }
        }

        // Check for NOTA articles (often problematic)
        if (violation.article === 'NOTA' || violation.article?.includes('circular')) {
            warnings.push({
                code: 'NOTA_WARNING',
                type: violation.classification,
                article: violation.article,
                message: 'Artigo NOTA detectado - verifique se não se trata de requisito documental',
                severity: 'warning',
                recommendation: 'Se for sobre documentação de outras entidades, deve ser OBSERVAÇÃO'
            });
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate array of violations
     */
    validateViolations(violations) {
        const results = {
            valid: true,
            totalViolations: violations.length,
            invalidViolations: 0,
            warnings: 0,
            violations: []
        };

        violations.forEach((violation, index) => {
            const validation = this.validateViolation(violation);
            
            results.violations.push({
                index: index,
                violation: violation,
                validation: validation
            });

            if (!validation.valid) {
                results.valid = false;
                results.invalidViolations += validation.errors.length;
            }

            results.warnings += validation.warnings.length;
        });

        return results;
    }

    /**
     * Generate correction suggestion
     */
    suggestCorrection(violation) {
        return {
            original: violation,
            suggestion: {
                type: 'OBSERVAÇÃO',
                description: `OBSERVAÇÃO: ${violation.description.replace(/NOTA:|Falta|Não apresenta/gi, 'A instalação não apresenta')}. Recomenda-se regularização junto da entidade competente.`,
                reason: 'Convertido conforme Circular IPAC 06/2025 - verificação documental não é competência da EIIE'
            }
        };
    }

    /**
     * Generate HTML warning badge for invalid violations
     */
    generateWarningBadge(validation) {
        if (!validation.errors || validation.errors.length === 0) {
            return '';
        }

        const error = validation.errors[0];
        return `
            <div class="alert alert-danger border-left-danger mt-2 mb-2">
                <div class="d-flex align-items-start">
                    <i class="fas fa-exclamation-triangle fa-2x mr-3 text-danger"></i>
                    <div class="flex-grow-1">
                        <h6 class="mb-2">
                            <i class="fas fa-ban"></i> Descritor Inválido (IPAC 06/2025)
                        </h6>
                        <p class="mb-2"><strong>Código:</strong> ${error.code}</p>
                        <p class="mb-2"><strong>Problema:</strong> ${error.message}</p>
                        <p class="mb-2"><strong>Severidade:</strong> <span class="badge badge-danger">${error.severity.toUpperCase()}</span></p>
                        <hr class="my-2">
                        <p class="mb-1"><small><i class="fas fa-lightbulb text-warning"></i> <strong>Recomendação:</strong></small></p>
                        <p class="mb-0"><small>${error.recommendation}</small></p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate HTML warning badge for warnings
     */
    generateWarningAlert(validation) {
        if (!validation.warnings || validation.warnings.length === 0) {
            return '';
        }

        const warning = validation.warnings[0];
        return `
            <div class="alert alert-warning border-left-warning mt-2 mb-2">
                <div class="d-flex align-items-start">
                    <i class="fas fa-exclamation-circle mr-2 text-warning"></i>
                    <div class="flex-grow-1">
                        <p class="mb-1"><strong>Atenção:</strong> ${warning.message}</p>
                        <p class="mb-0"><small>${warning.recommendation}</small></p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate summary report
     */
    generateSummaryReport(validationResults) {
        const { valid, totalViolations, invalidViolations, warnings } = validationResults;

        let html = `
            <div class="card mb-3 ${valid ? 'border-success' : 'border-danger'}">
                <div class="card-header ${valid ? 'bg-success' : 'bg-danger'} text-white">
                    <h5 class="mb-0">
                        <i class="fas fa-${valid ? 'check-circle' : 'times-circle'}"></i>
                        Validação IPAC 06/2025
                    </h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4 text-center">
                            <h3 class="mb-0 ${valid ? 'text-success' : 'text-danger'}">${totalViolations}</h3>
                            <p class="text-muted mb-0">Total de Deficiências</p>
                        </div>
                        <div class="col-md-4 text-center">
                            <h3 class="mb-0 ${invalidViolations > 0 ? 'text-danger' : 'text-success'}">${invalidViolations}</h3>
                            <p class="text-muted mb-0">Descritores Inválidos</p>
                        </div>
                        <div class="col-md-4 text-center">
                            <h3 class="mb-0 ${warnings > 0 ? 'text-warning' : 'text-success'}">${warnings}</h3>
                            <p class="text-muted mb-0">Avisos</p>
                        </div>
                    </div>
                    <hr>
                    <p class="mb-0">
                        ${valid ? 
                            '<i class="fas fa-check text-success"></i> Relatório em conformidade com Circular IPAC 06/2025' : 
                            '<i class="fas fa-times text-danger"></i> Relatório contém descritores inválidos que devem ser corrigidos'
                        }
                    </p>
                </div>
            </div>
        `;

        return html;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IPACValidator;
}
