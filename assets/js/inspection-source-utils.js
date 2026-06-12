(function(global) {
    'use strict';

    function toDate(raw) {
        if (!raw) return null;
        const d = raw instanceof Date ? new Date(raw.getTime()) : new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    function cloneDate(d) {
        return d ? new Date(d.getTime()) : null;
    }

    function getLatestInspectionRecord(lift) {
        const records = Array.isArray(lift && lift.inspectionHistory) ? lift.inspectionHistory : [];
        if (!records.length) return null;

        let latest = null;
        let latestTs = -Infinity;

        records.forEach(function(record) {
            const d = toDate(record && (record.date || record.inspectionDate));
            if (!d) return;
            const ts = d.getTime();
            if (!latest || ts > latestTs) {
                latest = record;
                latestTs = ts;
            }
        });

        return latest;
    }

    function getResolvedInspectionStatus(lift, latest) {
        return String(
            (lift && lift.inspectionStatus) ||
            (latest && latest.status) ||
            ''
        ).toLowerCase();
    }

    function resolveExplicitExpiry(lift, latest) {
        const candidates = [
            { value: lift && lift.nextInspectionDate, source: 'manual' },
            { value: lift && lift.licenseExpiry, source: 'manual' },
            { value: lift && lift.certExpiry, source: 'manual' },
            { value: latest && latest.validUntil, source: 'report' },
            { value: latest && latest.nextInspectionDate, source: 'report' }
        ];

        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            const d = toDate(candidate.value);
            if (d) {
                return { date: d, source: candidate.source, mode: 'explicit' };
            }
        }

        return null;
    }

    function resolveDerivedExpiry(lift, latest) {
        const base =
            toDate(latest && (latest.date || latest.inspectionDate)) ||
            toDate(lift && lift.lastInspectionDate) ||
            toDate(lift && lift.licenseDate) ||
            toDate(lift && lift.certDate) ||
            toDate(lift && lift.lastMaintenance) ||
            null;

        if (!base) return null;

        const certType = String((latest && latest.certType) || '').toLowerCase();
        const status = getResolvedInspectionStatus(lift, latest);
        const c1 = Number((latest && latest.c1Count) || 0);
        const c2 = Number((latest && latest.c2Count) || 0);
        const hasLegacyNoStatus =
            !((lift && lift.inspectionStatus) || '') &&
            !((latest && latest.status) || '');

        const out = cloneDate(base);
        let source = latest ? 'derived_report' : 'derived_manual';

        if (certType === 'cert_2_years' || status === 'passed' || hasLegacyNoStatus) {
            out.setFullYear(out.getFullYear() + 2);
        } else if (
            certType === 'immobilization' ||
            status === 'failed' ||
            (c1 > 0 && c2 === 0)
        ) {
            // C1 / imobilização: elevator grounded, re-inspect within 30 days
            out.setDate(out.getDate() + 30);
        } else if (
            certType === 'reinspection' ||
            status === 'conditional' ||
            c2 > 0
        ) {
            // C2: certificate valid for 2 years (DL 320/2002); re-inspection within 90 days
            out.setFullYear(out.getFullYear() + 2);
        } else {
            out.setDate(out.getDate() + 180);
            source = latest ? 'derived_report' : 'estimated';
        }

        return { date: out, source: source, mode: 'derived' };
    }

    function getEffectiveExpiryInfo(lift) {
        const latest = getLatestInspectionRecord(lift);
        const explicit = resolveExplicitExpiry(lift, latest);
        if (explicit) {
            return { date: explicit.date, source: explicit.source, mode: explicit.mode, latestRecord: latest };
        }

        const derived = resolveDerivedExpiry(lift, latest);
        if (derived) {
            return { date: derived.date, source: derived.source, mode: derived.mode, latestRecord: latest };
        }

        return { date: null, source: 'none', mode: 'none', latestRecord: latest };
    }

    function getEffectiveLastInspectionDate(lift) {
        const latest = getLatestInspectionRecord(lift);
        return (
            toDate(lift && lift.lastInspectionDate) ||
            toDate(lift && lift.licenseDate) ||
            toDate(lift && lift.certDate) ||
            toDate(lift && lift.lastMaintenance) ||
            toDate(latest && (latest.date || latest.inspectionDate)) ||
            null
        );
    }

    function getSourceMetaByCode(sourceCode) {
        const map = {
            report: {
                short: 'relatorio',
                shortPt: 'relatório',
                longPt: 'Relatório de inspeção',
                tooltipPt: 'Fonte: relatório de inspeção'
            },
            manual: {
                short: 'manual',
                shortPt: 'dados manuais de certificado',
                longPt: 'Dados manuais de certificado (sem relatório anexado)',
                tooltipPt: 'Fonte: dados manuais de certificado (sem relatório anexado)'
            },
            derived_report: {
                short: 'derivado_relatorio',
                shortPt: 'cálculo a partir de relatório',
                longPt: 'Cálculo a partir do último relatório de inspeção',
                tooltipPt: 'Fonte: cálculo a partir do último relatório de inspeção'
            },
            derived_manual: {
                short: 'derivado_manual',
                shortPt: 'cálculo a partir de dados manuais',
                longPt: 'Cálculo a partir de dados manuais de certificado',
                tooltipPt: 'Fonte: cálculo a partir de dados manuais de certificado'
            },
            estimated: {
                short: 'estimado',
                shortPt: 'dados estimados',
                longPt: 'Dados estimados',
                tooltipPt: 'Fonte: dados estimados'
            },
            none: {
                short: 'none',
                shortPt: 'sem fonte definida',
                longPt: 'Sem fonte de validade',
                tooltipPt: 'Fonte: sem fonte definida'
            }
        };

        return map[sourceCode] || map.none;
    }

    function getSourceMeta(lift) {
        const info = getEffectiveExpiryInfo(lift);
        const meta = getSourceMetaByCode(info.source);
        return {
            source: info.source,
            mode: info.mode,
            date: info.date,
            shortPt: meta.shortPt,
            longPt: meta.longPt,
            tooltipPt: meta.tooltipPt
        };
    }

    function formatSourceLabel(lift, type) {
        const meta = getSourceMeta(lift);
        if (type === 'short') return meta.shortPt;
        if (type === 'tooltip') return meta.tooltipPt;
        return meta.longPt;
    }

    global.InspectionSourceUtils = {
        toDate: toDate,
        getLatestInspectionRecord: getLatestInspectionRecord,
        getResolvedInspectionStatus: getResolvedInspectionStatus,
        getEffectiveExpiryInfo: getEffectiveExpiryInfo,
        getEffectiveNextInspectionDate: function(lift) {
            return getEffectiveExpiryInfo(lift).date;
        },
        getEffectiveLastInspectionDate: getEffectiveLastInspectionDate,
        getSourceMeta: getSourceMeta,
        formatSourceLabel: formatSourceLabel
    };
})(window);
