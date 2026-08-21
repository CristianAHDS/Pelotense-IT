const CONHECIDOS = [
  { nome: 'ESTAGIO-005', ip: '192.168.8.14', mac: '60:c7:27:05:d0:7e' },
  { nome: 'REC-026', ip: '192.168.8.26', mac: '18:a5:9c:bb:75:22' },
  { nome: 'GUSTAVO-007', ip: '192.168.8.27', mac: '04:e8:b9:d2:7a:67' },
  { nome: 'DESKTOP-ESBQBP8', ip: '192.168.8.39', mac: '60:c7:27:05:d0:6b' },
  { nome: 'LUCAS-003', ip: '192.168.8.43', mac: '18:a5:9c:bb:74:50' },
  { nome: 'LETÍCIA', ip: '192.168.8.45', mac: '18:a5:9c:bb:74:ef' },
  { nome: 'LIDIANE-018', ip: '192.168.8.54', mac: '18:a5:9c:bb:73:9e' },
  { nome: 'ADELINE-020', ip: '192.168.8.56', mac: '18:a5:9c:bb:74:f2' },
  { nome: 'LAURECI-023', ip: '192.168.8.57', mac: '18:a5:9c:bb:74:e6' },
  { nome: 'RISSE-009', ip: '192.168.8.69', mac: '18:a5:9c:bb:73:6d' },
  { nome: 'MAGRÇO-006', ip: '192.168.8.80', mac: '60:c7:27:05:d0:80' },
  { nome: 'PELOTENSE-03', ip: '192.168.8.92', mac: '60:c7:27:2e:80:0a' },
  { nome: 'cristian', ip: '192.168.8.94', mac: '60:c7:27:1f:de:38' },
  { nome: 'RASCADO-002', ip: '192.168.8.100', mac: '04:e8:b9:d2:7b:39' },
  { nome: '311-97D6A0', ip: '192.168.8.101', mac: '58:38:79:97:d6:a0' },
  { nome: 'BARBARA-010', ip: '192.168.8.105', mac: '18:a5:9c:bb:74:29' },
  { nome: 'AHORADOSUL-023', ip: '192.168.8.110' },
  { nome: 'NATALLI', ip: '192.168.8.122', mac: '18:a5:9c:bb:74:fa' },
  { nome: 'FOLHA-008', ip: '192.168.8.124', mac: '60:c7:27:05:d0:82' },
  { nome: 'CARLA-017', ip: '192.168.8.136', mac: '18:a5:9c:bb:73:71' },
  { nome: 'USUARIO-PC', ip: '192.168.8.143' },
  { nome: 'VIC-013', ip: '192.168.8.153', mac: '18:a5:9c:bb:74:09' },
  { nome: 'JP-012', ip: '192.168.8.154', mac: '18:a5:9c:bb:75:23' },
  { nome: 'PELOTENSE-02', ip: '192.168.8.155', mac: '60:c7:27:2c:0b:91' },
  { nome: 'LAPTOP-BSUGC91K', ip: '192.168.8.174' },
  { nome: 'PELOTENSE-006', ip: '192.168.8.208', mac: '60:c7:27:30:d3:81' },
  { nome: 'ANA-015', ip: '192.168.8.222', mac: '18:a5:9c:bb:75:19' },
  { nome: 'ZENTYAL-SERVER', ip: '192.168.8.231', mac: 'b0:8a:ef:fc:e7:7f' },
  { nome: 'MARCELO-025', ip: '192.168.8.241', mac: '60:c7:27:12:f3:45' },
  { nome: 'DESKTOP-1LQEPCG', ip: '192.168.8.244', mac: '00:d7:6d:a5:68:06' },
];

function normalizarMac(mac) {
  return mac ? String(mac).toLowerCase().replace(/-/g, ':') : null;
}

function nomeConhecido(ip, mac) {
  const macNorm = normalizarMac(mac);
  if (macNorm) {
    const porMac = CONHECIDOS.find((c) => c.mac === macNorm);
    if (porMac) return porMac.nome;
  }
  const porIp = CONHECIDOS.find((c) => c.ip === ip);
  return porIp ? porIp.nome : null;
}

module.exports = { nomeConhecido };
