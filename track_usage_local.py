
#  Perfeito! 🎯

#   Agora você tem um rastreamento local funcionando sem       
#   precisar da API. Resumo rápido:

#   # Terminal 1 - Monitor rodando
#   python track_usage_local.py monitor

#   # Terminal 2 - Registrar chamadas
#   python track_usage_local.py log 1500 300
#   python track_usage_local.py log 2000 500

#   # Comandos extras
#   python track_usage_local.py view      # Ver uma única      
#   vez
#   python track_usage_local.py export    # Exportar
#   relatório
#   python track_usage_local.py reset     # Limpar log


#!/usr/bin/env python3
"""
Track Claude API usage locally by logging token consumption
"""

import os
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict
import time

# ANSI color codes
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Local tracking file
USAGE_LOG_FILE = "api_usage_log.json"
HOURLY_LIMIT = 1000000  # Limite de 5 horas (aproximado)
WEEKLY_LIMIT = 5000000  # Limite de 7 dias (aproximado)

def load_usage_log() -> Dict:
    """Load existing usage log or create new one"""
    if os.path.exists(USAGE_LOG_FILE):
        try:
            with open(USAGE_LOG_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading log: {e}")

    return {
        "created_at": datetime.now().isoformat(),
        "calls": [],
        "total_input_tokens": 0,
        "total_output_tokens": 0
    }

def save_usage_log(log: Dict):
    """Save usage log to file"""
    try:
        with open(USAGE_LOG_FILE, 'w') as f:
            json.dump(log, f, indent=2)
    except Exception as e:
        print(f"Error saving log: {e}")

def log_api_call(input_tokens: int, output_tokens: int, model: str = "claude"):
    """
    Log an API call with token consumption

    Args:
        input_tokens: Tokens used in the request
        output_tokens: Tokens generated in the response
        model: Model used (default: claude)
    """
    log = load_usage_log()

    call_record = {
        "timestamp": datetime.now().isoformat(),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "model": model
    }

    log["calls"].append(call_record)
    log["total_input_tokens"] += input_tokens
    log["total_output_tokens"] += output_tokens

    save_usage_log(log)

def get_usage_last_hours(hours: int = 5) -> Dict:
    """Get usage from last N hours"""
    log = load_usage_log()
    cutoff_time = datetime.now() - timedelta(hours=hours)

    input_tokens = 0
    output_tokens = 0
    call_count = 0

    for call in log["calls"]:
        call_time = datetime.fromisoformat(call["timestamp"])
        if call_time >= cutoff_time:
            input_tokens += call["input_tokens"]
            output_tokens += call["output_tokens"]
            call_count += 1

    return {
        "period_hours": hours,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "call_count": call_count,
        "percentage": (input_tokens + output_tokens) / HOURLY_LIMIT * 100
    }

def get_usage_last_days(days: int = 7) -> Dict:
    """Get usage from last N days"""
    log = load_usage_log()
    cutoff_time = datetime.now() - timedelta(days=days)

    input_tokens = 0
    output_tokens = 0
    call_count = 0

    for call in log["calls"]:
        call_time = datetime.fromisoformat(call["timestamp"])
        if call_time >= cutoff_time:
            input_tokens += call["input_tokens"]
            output_tokens += call["output_tokens"]
            call_count += 1

    return {
        "period_days": days,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "call_count": call_count,
        "percentage": (input_tokens + output_tokens) / WEEKLY_LIMIT * 100
    }

def get_total_usage() -> Dict:
    """Get total usage since tracking started"""
    log = load_usage_log()

    return {
        "total_input_tokens": log["total_input_tokens"],
        "total_output_tokens": log["total_output_tokens"],
        "total_tokens": log["total_input_tokens"] + log["total_output_tokens"],
        "total_calls": len(log["calls"]),
        "tracking_since": log["created_at"]
    }

def format_number(num):
    """Format large numbers with thousands separator"""
    return f"{num:,}"

def get_progress_bar(percentage: float, width: int = 30) -> str:
    """Create a visual progress bar"""
    filled = int((percentage / 100) * width)
    bar = '█' * filled + '░' * (width - filled)
    return f"[{bar}]"

def get_color_by_percentage(percentage: float) -> str:
    """Get color based on percentage"""
    if percentage >= 98:
        return Colors.RED
    elif percentage >= 90:
        return Colors.RED
    elif percentage >= 80:
        return Colors.YELLOW
    elif percentage >= 50:
        return Colors.YELLOW
    else:
        return Colors.GREEN

def display_usage():
    """Display formatted usage statistics"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════════{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.CYAN}         RASTREAMENTO LOCAL DE USO DA API CLAUDE{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════════{Colors.ENDC}\n")

    # Uso das últimas 5 horas
    usage_5h = get_usage_last_hours(5)
    color_5h = get_color_by_percentage(usage_5h["percentage"])
    progress_5h = get_progress_bar(usage_5h["percentage"])

    print(f"{Colors.BOLD}Últimas 5 horas:{Colors.ENDC}")
    print(f"  {color_5h}Input: {format_number(usage_5h['input_tokens'])} tokens{Colors.ENDC}")
    print(f"  {color_5h}Output: {format_number(usage_5h['output_tokens'])} tokens{Colors.ENDC}")
    print(f"  {color_5h}{progress_5h} {usage_5h['percentage']:.2f}% do limite (~1M tokens){Colors.ENDC}")
    print(f"  Chamadas: {usage_5h['call_count']}\n")

    # Uso dos últimos 7 dias
    usage_7d = get_usage_last_days(7)
    color_7d = get_color_by_percentage(usage_7d["percentage"])
    progress_7d = get_progress_bar(usage_7d["percentage"])

    print(f"{Colors.BOLD}Últimos 7 dias:{Colors.ENDC}")
    print(f"  {color_7d}Input: {format_number(usage_7d['input_tokens'])} tokens{Colors.ENDC}")
    print(f"  {color_7d}Output: {format_number(usage_7d['output_tokens'])} tokens{Colors.ENDC}")
    print(f"  {color_7d}{progress_7d} {usage_7d['percentage']:.2f}% do limite (~5M tokens){Colors.ENDC}")
    print(f"  Chamadas: {usage_7d['call_count']}\n")

    # Total desde o início
    total = get_total_usage()
    print(f"{Colors.BOLD}{Colors.GREEN}Total desde o início:{Colors.ENDC}")
    print(f"  Input: {format_number(total['total_input_tokens'])} tokens")
    print(f"  Output: {format_number(total['total_output_tokens'])} tokens")
    print(f"  {Colors.BOLD}Total: {format_number(total['total_tokens'])} tokens{Colors.ENDC}")
    print(f"  Chamadas: {total['total_calls']}")
    print(f"  Rastreando desde: {total['tracking_since']}\n")

    print(f"{Colors.BOLD}{Colors.CYAN}═══════════════════════════════════════════════════════════════{Colors.ENDC}\n")

def clear_screen():
    """Clear terminal screen"""
    os.system('cls' if os.name == 'nt' else 'clear')

def monitor_usage(interval: int = 3):
    """
    Monitor usage in real-time with continuous updates

    Args:
        interval: Update interval in seconds (default: 3)
    """
    print(f"{Colors.GREEN}Iniciando monitor de uso local...{Colors.ENDC}")
    print(f"Intervalo de atualização: {interval} segundos")
    print(f"Pressione Ctrl+C para sair\n")
    time.sleep(2)

    try:
        iteration = 0
        while True:
            clear_screen()
            display_usage()

            iteration += 1
            print(f"{Colors.YELLOW}Iteração: {iteration} | Próxima atualização em {interval}s...{Colors.ENDC}")
            print(f"{Colors.BLUE}Para registrar uma chamada, abra outro terminal e execute:{Colors.ENDC}")
            print(f"{Colors.CYAN}  python track_usage_local.py log <input_tokens> <output_tokens>{Colors.ENDC}\n")

            time.sleep(interval)

    except KeyboardInterrupt:
        clear_screen()
        print(f"\n{Colors.YELLOW}Monitor parado pelo usuário{Colors.ENDC}\n")
        sys.exit(0)

def main():
    """Main entry point"""

    if len(sys.argv) < 2:
        print(f"{Colors.YELLOW}Uso: python track_usage_local.py [comando] [args]{Colors.ENDC}\n")
        print("Comandos:")
        print("  monitor [intervalo]  - Monitora uso em tempo real (intervalo em segundos, padrão: 3)")
        print("  view                - Exibe o uso atual (uma única vez)")
        print("  log <input> <output> - Registra uma chamada (tokens)")
        print("  reset               - Limpa o arquivo de log")
        print("  export              - Exporta relatório completo\n")
        print("Exemplos:")
        print("  python track_usage_local.py monitor")
        print("  python track_usage_local.py monitor 5")
        print("  python track_usage_local.py log 1500 300")
        print("  python track_usage_local.py view\n")
        return

    command = sys.argv[1].lower()

    if command == "monitor":
        interval = 3
        if len(sys.argv) > 2:
            try:
                interval = int(sys.argv[2])
            except ValueError:
                print(f"{Colors.RED}Erro: intervalo deve ser um número{Colors.ENDC}")
                return
        monitor_usage(interval)

    elif command == "view":
        display_usage()

    elif command == "log":
        if len(sys.argv) < 4:
            print(f"{Colors.RED}Erro: fornecça input_tokens e output_tokens{Colors.ENDC}")
            return

        try:
            input_tokens = int(sys.argv[2])
            output_tokens = int(sys.argv[3])
            model = sys.argv[4] if len(sys.argv) > 4 else "claude"

            log_api_call(input_tokens, output_tokens, model)
            print(f"{Colors.GREEN}✓ Chamada registrada: {input_tokens + output_tokens} tokens{Colors.ENDC}")
        except ValueError:
            print(f"{Colors.RED}Erro: tokens devem ser números{Colors.ENDC}")

    elif command == "reset":
        if os.path.exists(USAGE_LOG_FILE):
            os.remove(USAGE_LOG_FILE)
            print(f"{Colors.GREEN}✓ Log limpado{Colors.ENDC}")
        else:
            print(f"{Colors.YELLOW}Nenhum arquivo de log encontrado{Colors.ENDC}")

    elif command == "export":
        try:
            log = load_usage_log()
            export_file = f"usage_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(export_file, 'w') as f:
                json.dump(log, f, indent=2)
            print(f"{Colors.GREEN}✓ Relatório exportado: {export_file}{Colors.ENDC}")
        except Exception as e:
            print(f"{Colors.RED}Erro ao exportar: {e}{Colors.ENDC}")

    else:
        print(f"{Colors.RED}Comando desconhecido: {command}{Colors.ENDC}")

if __name__ == "__main__":
    main()
