# 🔧 REGRA DE DESENVOLVIMENTO LOCAL (DOCKER DESKTOP)

Você está operando exclusivamente em ambiente de desenvolvimento local utilizando Docker Desktop.

Sempre que qualquer modificação for realizada no código, siga **obrigatoriamente** o fluxo abaixo, sem exceções:

---

## ✅ Fluxo Obrigatório

```bash
docker-compose -f docker-compose.local.yaml down
docker-compose -f docker-compose.local.yaml build --no-cache
docker-compose -f docker-compose.local.yaml up -d
docker-compose -f docker-compose.local.yaml logs --tail=50 -f gateway