"""
ORACLE DE TEST — implémentation indépendante du rythme de garde.
Aucune dépendance sur le moteur de l'appli. Sert à diffuser jour par jour.
Sortie : pour chaque date -> (damien_a_CJ, ma_a_clotilde) puis état croisé.
Gère la demi-journée : renvoie (am, pm) quand le jour est coupé à 14:00.
"""
from datetime import date, timedelta

# ---------- Calendrier zone C 2026-2027 (dates en dur) ----------
VACANCES = {  # bornes inclusives (jours non scolaires)
    "Toussaint": (date(2026,10,17), date(2026,11,1)),
    "Noel":      (date(2026,12,19), date(2027,1,3)),
    "Hiver":     (date(2027,2,6),   date(2027,2,21)),
    "Printemps": (date(2027,4,3),   date(2027,4,18)),
    "Ete":       (date(2027,7,3),   date(2027,8,31)),
}
def vacance_de(d):
    for nom,(a,b) in VACANCES.items():
        if a<=d<=b: return nom
    return None

def iso_impaire(d): return d.isocalendar()[1] % 2 == 1

# =========================================================
# PLANNING DAMIEN (Camille & Juliette) -> True = Damien
# Renvoie soit un bool (journée entière), soit ('SPLIT', am, pm)
# =========================================================
BASCULE_SAMEDI = {           # samedi 14:00 : (matin_damien, aprem_damien)
    date(2026,10,24): (True,  False),
    date(2026,12,26): (False, True),
    date(2027,2,13):  (False, True),
    date(2027,4,10):  (False, True),
}
DIMANCHE_ENTRANT = {         # dimanche suivant -> parent entrant
    date(2026,10,25): False,
    date(2026,12,27): True,
    date(2027,2,14):  True,
    date(2027,4,11):  True,
}
FERIE_LUNDI = {              # reste au parent du week-end
    date(2027,3,29): False,  # Paques
    date(2027,5,17): True,   # Pentecote
}
# Été 2027 (année impaire) : Damien = S1,3,4,5 ; passation le dimanche
ETE = [
    (date(2027,7,4),  date(2027,7,10), True),   # S1
    (date(2027,7,11), date(2027,7,17), False),  # S2
    (date(2027,7,18), date(2027,7,24), True),   # S3
    (date(2027,7,25), date(2027,7,31), True),   # S4
    (date(2027,8,1),  date(2027,8,7),  True),   # S5
    (date(2027,8,8),  date(2027,8,14), False),  # S6
    (date(2027,8,15), date(2027,8,21), False),  # S7
    (date(2027,8,22), date(2027,8,28), False),  # S8
    (date(2027,8,29), date(2027,8,31), True),   # reprise scolaire (wk35 impaire)
]
def damien(d):
    # priorité haute -> basse
    if d in BASCULE_SAMEDI:
        am,pm = BASCULE_SAMEDI[d]; return ('SPLIT', am, pm)
    if d in FERIE_LUNDI: return FERIE_LUNDI[d]
    if d in DIMANCHE_ENTRANT: return DIMANCHE_ENTRANT[d]
    if vacance_de(d) == "Ete":
        for a,b,v in ETE:
            if a<=d<=b: return v
        return iso_impaire(d)  # 03/07 (avant S1) : parité
    # base + petites vacances : parité ISO, bascule lundi
    return iso_impaire(d)

# =========================================================
# PLANNING CLOTILDE -> True = Marie-Alix
# =========================================================
# Vacances : segments explicites (source de vérité), bornes [de, a] inclusives
CLO_VAC = [
    (date(2026,10,17), date(2026,10,23), False),
    (date(2026,10,24), date(2026,10,30), True),
    (date(2026,10,31), date(2026,11,1),  False),
    (date(2026,12,19), date(2026,12,19), True),
    (date(2026,12,20), date(2026,12,26), False),
    (date(2026,12,27), date(2027,1,3),   True),
    (date(2027,2,6),   date(2027,2,14),  True),
    (date(2027,2,15),  date(2027,2,21),  False),
    (date(2027,4,3),   date(2027,4,11),  True),
    (date(2027,4,12),  date(2027,4,18),  False),
    (date(2027,7,3),   date(2027,7,4),   False),
    (date(2027,7,5),   date(2027,7,11),  True),
    (date(2027,7,12),  date(2027,7,18),  False),
    (date(2027,7,19),  date(2027,7,25),  True),
    (date(2027,7,26),  date(2027,8,1),   False),
    (date(2027,8,2),   date(2027,8,15),  True),
    (date(2027,8,16),  date(2027,8,29),  False),
    (date(2027,8,30),  date(2027,8,31),  True),
]

# Modifications ponctuelles Clotilde (échanges documentés V4 : compensations Barcelone / voyage scolaire)
# Sur ces vendredis de semaine impaire, le week-end MA commence au samedi (vendredi -> père).
CLO_EXC = {
    date(2026,11,6):  False,
    date(2026,11,20): False,
    date(2026,12,4):  False,
    date(2026,12,18): False,
}

def clotilde(d):
    if d in CLO_EXC: return CLO_EXC[d]
    if vacance_de(d) is not None:
        for a,b,v in CLO_VAC:
            if a<=d<=b: return v
    # période scolaire (cycle 14 j)
    wd = d.weekday()  # 0=lun
    if wd in (0,1): return True     # lun mar -> MA
    if wd in (2,3): return False    # mer jeu -> pere
    return iso_impaire(d)           # ven sam dim -> MA si impaire

# =========================================================
# Croisement -> état
# =========================================================
def etat(damien_a, ma_a):
    if damien_a and ma_a: return "PURPLE"
    if damien_a and not ma_a: return "BLUE"
    if (not damien_a) and ma_a: return "ORANGE"
    return "GREEN"

if __name__ == "__main__":
    import csv, sys
    start, end = date(2026,9,1), date(2027,8,31)
    FR=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
    cnt={'GREEN':0.0,'PURPLE':0.0,'BLUE':0.0,'ORANGE':0.0}
    pere_tot=0.0; ma_tot=0.0
    rows=[]
    d=start
    while d<=end:
        dv=damien(d); mv=clotilde(d)
        if isinstance(dv,tuple):  # SPLIT
            _,am,pm=dv
            s_am=etat(am,mv); s_pm=etat(pm,mv)
            cnt[s_am]+=0.5; cnt[s_pm]+=0.5
            pere_tot+=(0.5 if am else 0)+(0.5 if pm else 0)
            etat_str=f"{s_am}|{s_pm}"; dstr=f"{am}|{pm}"
        else:
            s=etat(dv,mv); cnt[s]+=1; pere_tot+=1 if dv else 0
            etat_str=s; dstr=str(dv)
        ma_tot += 1 if mv else 0
        rows.append([d.isoformat(),FR[d.weekday()],d.isocalendar()[1],
                     'imp' if iso_impaire(d) else 'pai',dstr,str(mv),etat_str,
                     vacance_de(d) or '', 'SPLIT' if isinstance(dv,tuple) else ''])
        d+=timedelta(days=1)
    with open('oracle_365j.csv','w',newline='') as f:
        w=csv.writer(f)
        w.writerow(['date','jour','iso_week','parite','damien_a_CJ','ma_a_clotilde','etat','vacance','split'])
        w.writerows(rows)
    print("=== INVARIANTS ===")
    print("Total jours :", len(rows))
    print("Décompte :", {k:cnt[k] for k in ['GREEN','PURPLE','BLUE','ORANGE']}, "somme", sum(cnt.values()))
    print("Damien avec enfants (BLUE+PURPLE) =", cnt['BLUE']+cnt['PURPLE'], "| total Père =", pere_tot)
    print("Clotilde chez MA (ORANGE+PURPLE) =", cnt['ORANGE']+cnt['PURPLE'], "| MA jours =", ma_tot)
    # test semaine 19 oct
    print("\n=== test 19-24 oct ===")
    for day in range(19,25):
        dd=date(2026,10,day); dv=damien(dd)
        print(dd, FR[dd.weekday()], "Damien=",dv,"Clo=",clotilde(dd),"->",
              etat(dv,clotilde(dd)) if not isinstance(dv,tuple) else "SPLIT")
