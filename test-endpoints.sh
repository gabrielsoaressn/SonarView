#!/bin/bash

echo "🧪 Testando Endpoints do SonarCloud..."
echo ""

echo "1️⃣ Testing Issues em Código Novo:"
curl -s "http://localhost:3001/api/sonarcloud/new-code-issues?project=fklearn" | jq '{total, totalBugs, totalVulnerabilities, totalCodeSmells, primeirosIssues: .issues.codeSmells[:3] | map({severity, component, message})}'
echo ""

echo "2️⃣ Testing Complexidade:"
curl -s "http://localhost:3001/api/sonarcloud/complexity?project=fklearn" | jq '{stats: .stats | {totalComponents, avgComplexity, maxComplexity}, top3: .stats.hotspots[:3] | map({name, complexity, linesOfCode})}'
echo ""

echo "3️⃣ Testing Cobertura:"
curl -s "http://localhost:3001/api/sonarcloud/coverage-by-file?project=fklearn" | jq '{total: .components | length, top3Pior: .worstCoverage[:3] | map({name, coverage, uncoveredLines})}'
echo ""

echo "✅ Testes concluídos!"
