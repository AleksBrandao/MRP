from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import re

def validate_positive_decimal(value):
    """Valida que o valor decimal seja positivo"""
    if value <= 0:
        raise ValidationError(f'{value} deve ser maior que zero.')

def validate_lead_time(value):
    """Valida que o lead time seja não negativo"""
    if value < 0:
        raise ValidationError('Lead time não pode ser negativo.')
        
def validate_codigo_produto(value):
    """Valida formato do código do produto"""
    if value and not re.match(r'^[A-Za-z0-9\-_\.]+$', value):
        raise ValidationError(
            'Código deve conter apenas letras, números, hífen, underscore ou ponto.'
        )

def validate_percentage(value):
    """Valida que o valor esteja entre 0 e 100"""
    if value < 0 or value > 100:
        raise ValidationError(f'{value} deve estar entre 0 e 100.')
        
def validate_quantidade_bom(value):
    """Valida quantidade na BOM"""
    if value <= 0:
        raise ValidationError('Quantidade deve ser maior que zero.')
    if value > Decimal('999999.9999'):
        raise ValidationError('Quantidade excede o máximo permitido.')

def validate_no_circular_reference(lista_pai, sublista):
    """Valida que não há referência circular nas listas técnicas"""
    if not sublista:
        return
        
    visited = set()
    current = sublista
    
    while current:
        if current.id in visited:
            raise ValidationError('Referência circular detectada nas listas técnicas.')
        if current.id == lista_pai.id:
            raise ValidationError('Uma lista técnica não pode referenciar a si mesma.')
        visited.add(current.id)
        current = current.parent