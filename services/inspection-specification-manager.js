/**
 * Inspection Specification Manager
 * ==================================
 * 
 * Gerencia especificação de inspeção conforme Circular IPAC 06/2025
 * 
 * Determina que diploma(s) aplicar baseado em:
 * - Data de colocação em serviço
 * - Datas de modificações importantes
 * 
 * @implements Circular IPAC N.º 6/2025
 */

const { Pool } = require('pg');

class InspectionSpecificationManager {
    constructor(db) {
        this.db = db;
        
        // Mapeamento de regulamentos por período
        this.regulationTimeline = [
            {
                startDate: '1970-12-31',
                endDate: '1980-12-31',
                primaryRegulation: 'decreto-513-70',
                title: 'Decreto 513/70'
            },
            {
                startDate: '1981-01-01',
                endDate: '1998-12-31',
                primaryRegulation: 'decreto-regulamentar-13-80',
                title: 'Decreto Regulamentar 13/80'
            },
            {
                startDate: '1999-01-01',
                endDate: '2002-12-31',
                primaryRegulation: 'decreto-lei-295-98',
                title: 'Decreto-Lei 295/98'
            },
            {
                startDate: '2003-01-01',
                endDate: '2020-12-31',
                primaryRegulation: 'decreto-lei-320-2002',
                title: 'Decreto-Lei 320/2002'
            },
            {
                startDate: '2021-01-01',
                endDate: '2999-12-31',
                primaryRegulation: 'en-81-20-2020',
                title: 'EN 81-20:2020',
                additionalRegulations: ['en-81-50-2020']
            }
        ];
    }

    /**
     * Determinar especificação de inspeção para uma instalação
     * 
     * @param {Object} lift - Dados do elevador
     * @returns {Object} - Especificação de inspeção
     */
    async determineInspectionSpecification(lift) {
        const { 
            id, 
            commissioning_date, 
            modifications 
        } = lift;

        // 1. Regulamento base (colocação em serviço)
        const baseRegulation = this.getRegulationByDate(commissioning_date);

        // 2. Regulamentos para modificações importantes
        const modificationRegulations = [];
        
        if (modifications && modifications.length > 0) {
            for (const mod of modifications) {
                if (mod.is_important) {
                    const modReg = this.getRegulationByDate(mod.date);
                    
                    modificationRegulations.push({
                        modificationId: mod.id,
                        modificationDate: mod.date,
                        description: mod.description,
                        regulation: modReg,
                        applicableParts: mod.affected_components || []
                    });
                }
            }
        }

        return {
            liftId: id,
            commissioningDate: commissioning_date,
            baseRegulation: baseRegulation,
            modificationRegulations: modificationRegulations,
            applicableRegulations: this.consolidateRegulations(baseRegulation, modificationRegulations),
            generatedAt: new Date().toISOString(),
            source: 'Circular IPAC 06/2025'
        };
    }

    /**
     * Obter regulamento aplicável por data
     */
    getRegulationByDate(date) {
        const targetDate = new Date(date);
        
        for (const period of this.regulationTimeline) {
            const start = new Date(period.startDate);
            const end = new Date(period.endDate);
            
            if (targetDate >= start && targetDate <= end) {
                return {
                    id: period.primaryRegulation,
                    title: period.title,
                    applicableDate: date,
                    additionalRegulations: period.additionalRegulations || []
                };
            }
        }
        
        // Default para mais recente se data futura
        const latest = this.regulationTimeline[this.regulationTimeline.length - 1];
        return {
            id: latest.primaryRegulation,
            title: latest.title,
            applicableDate: date,
            additionalRegulations: latest.additionalRegulations || []
        };
    }

    /**
     * Consolidar regulamentos aplicáveis
     */
    consolidateRegulations(baseReg, modRegs) {
        const regulations = new Map();
        
        // Adicionar regulamento base
        regulations.set(baseReg.id, {
            ...baseReg,
            scope: 'base_installation',
            priority: 1
        });

        // Adicionar regulamentos das modificações
        modRegs.forEach((modReg, index) => {
            regulations.set(modReg.regulation.id, {
                ...modReg.regulation,
                scope: 'modification',
                modificationId: modReg.modificationId,
                applicableParts: modReg.applicableParts,
                priority: 2 + index
            });
        });

        return Array.from(regulations.values()).sort((a, b) => a.priority - b.priority);
    }

    /**
     * Obter histórico de modificações importantes
     */
    async getImportantModifications(liftId) {
        const query = `
            SELECT 
                m.id,
                m.modification_date as date,
                m.description,
                m.is_important,
                m.affected_components,
                m.notified_body,
                m.conformity_declaration,
                m.created_at
            FROM lift_modifications m
            WHERE m.lift_id = $1
              AND m.is_important = true
            ORDER BY m.modification_date ASC
        `;

        const result = await this.db.query(query, [liftId]);
        return result.rows;
    }

    /**
     * Verificar se modificação tem documentação adequada
     */
    async checkModificationDocumentation(modificationId) {
        const query = `
            SELECT 
                notified_body,
                conformity_declaration,
                technical_documentation
            FROM lift_modifications
            WHERE id = $1
        `;

        const result = await this.db.query(query, [modificationId]);
        
        if (result.rows.length === 0) {
            return { complete: false, missing: ['modification_record'] };
        }

        const mod = result.rows[0];
        const missing = [];

        if (!mod.notified_body) missing.push('notified_body');
        if (!mod.conformity_declaration) missing.push('conformity_declaration');
        if (!mod.technical_documentation) missing.push('technical_documentation');

        return {
            complete: missing.length === 0,
            missing: missing
        };
    }

    /**
     * Gerar especificação para próxima inspeção
     */
    async generateInspectionSpecification(liftId) {
        // Obter dados do elevador
        const liftQuery = `
            SELECT 
                l.id,
                l.internal_number,
                l.location,
                l.commissioning_date,
                l.manufacturer,
                l.model
            FROM lifts l
            WHERE l.id = $1
        `;

        const liftResult = await this.db.query(liftQuery, [liftId]);
        
        if (liftResult.rows.length === 0) {
            throw new Error(`Lift ${liftId} not found`);
        }

        const lift = liftResult.rows[0];

        // Obter modificações importantes
        const modifications = await this.getImportantModifications(liftId);

        // Adicionar dados de lift
        lift.modifications = modifications;

        // Determinar especificação
        const specification = await this.determineInspectionSpecification(lift);

        // Verificar documentação de modificações
        specification.modificationDocumentationStatus = [];
        
        for (const modReg of specification.modificationRegulations) {
            const docStatus = await this.checkModificationDocumentation(modReg.modificationId);
            specification.modificationDocumentationStatus.push({
                modificationId: modReg.modificationId,
                date: modReg.modificationDate,
                description: modReg.description,
                ...docStatus
            });
        }

        return specification;
    }

    /**
     * Validar se observação sobre modificação é apropriada
     * 
     * Conforme Circular IPAC 06/2025:
     * "Considera-se uma boa prática que, na ausência de intervenção devida 
     *  de organismo competente para verificação de modificação importante, 
     *  tal seja contemplado como observação nos relatórios de inspeção."
     */
    shouldAddModificationObservation(modificationDocStatus) {
        // Se documentação incompleta, recomendar observação
        if (!modificationDocStatus.complete) {
            return {
                shouldAdd: true,
                reason: 'missing_documentation',
                missingDocs: modificationDocStatus.missing,
                recommendation: 'Adicionar observação no relatório sobre ausência de documentação de modificação importante'
            };
        }

        return {
            shouldAdd: false,
            reason: 'documentation_complete'
        };
    }

    /**
     * Gerar texto de observação para relatório
     */
    generateObservationText(modification, docStatus) {
        const missingDocs = docStatus.missing.map(doc => {
            const labels = {
                'notified_body': 'Organismo Notificado',
                'conformity_declaration': 'Declaração de Conformidade',
                'technical_documentation': 'Documentação Técnica'
            };
            return labels[doc] || doc;
        }).join(', ');

        return `OBSERVAÇÃO (Circular IPAC 06/2025): A instalação sofreu modificação importante em ${modification.date} (${modification.description}). ` +
               `Ausência de: ${missingDocs}. ` +
               `Recomenda-se que o proprietário obtenha a devida documentação de organismo competente.`;
    }
}

module.exports = InspectionSpecificationManager;
