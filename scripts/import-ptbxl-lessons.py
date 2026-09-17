"""Offline converter for the CC BY 4.0 PTB-XL teaching records. Input: downloaded .hea/.dat files in a directory."""
import sys, pathlib, struct, re, json, hashlib
source=pathlib.Path(sys.argv[1]); output=pathlib.Path('public/ecg/ptbxl')
records=[('a','00010','records500/00000/00010_hr'),('b','03155','records500/03000/03155_hr'),('c','00057','records500/00000/00057_hr'),('d','00618','records500/00000/00618_hr'),('e','04117','records500/04000/04117_hr'),('f','02146','records500/02000/02146_hr'),('g','00023','records500/00000/00023_hr'),('h','00219','records500/00000/00219_hr'),('i','00052','records500/00000/00052_hr'),('j','14009','records500/14000/14009_hr'),('k','00526','records500/00000/00526_hr'),('l','01577','records500/01000/01577_hr'),('m','10873','records500/10000/10873_hr'),('n','07244','records500/07000/07244_hr')]
for key,record,path in records:
 header_path=source/(record+'_hr.hea'); raw_path=source/(record+'_hr.dat')
 if not header_path.exists() or not raw_path.exists(): continue
 header=header_path.read_text(); raw=raw_path.read_bytes()
 lines=header.splitlines(); name,channels,hz,count=lines[0].split()[:4]
 assert (int(channels),int(hz),int(count))==(12,500,5000)
 assert len(raw)==12*5000*2
 samples=struct.unpack('<'+'h'*(len(raw)//2),raw); leads={}
 for i,line in enumerate(lines[1:13]):
  fields=line.split(); assert fields[1]=='16'
  gain,baseline=re.fullmatch(r'([\d.]+)\((-?\d+)\)/mV',fields[2]).groups()
  values=samples[i::12]; assert values[0]==int(fields[5]); assert sum(values)%65536==int(fields[6])%65536
  assert -32768 not in values
  lead={'AVR':'aVR','AVL':'aVL','AVF':'aVF'}.get(fields[-1],fields[-1])
  leads[lead]=[round((v-int(baseline))/float(gain),6) for v in values]
 data={'sampleRate':500,'sampleCount':5000,'units':'mV','leads':leads,'sourceRecord':path,'sha256':hashlib.sha256(raw).hexdigest()}
 (output/(key+'.json')).write_text(json.dumps(data,separators=(',',':')))
 (output/(key+'.hea')).write_text(header)
 print(key,record,len(leads),'verified initial values and WFDB checksums')
