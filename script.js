// Konfigurasi Supabase untuk aplikasi browser / GitHub Pages.
// Gunakan publishable (anon) key, JANGAN gunakan secret/service-role key.
const SUPABASE_URL = 'https://qjnwpmzabwdojqobhxyu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OinbNXi6GRxzyjnX9S0Isg_mCOSoa3W';

async function dbRequest(metode, jalur, body) {
  if (!/^https:\/\/.+\.supabase\.co$/.test(SUPABASE_URL) || !SUPABASE_KEY || /XXXX|ISI_/.test(SUPABASE_KEY)) {
    throw new Error('SUPABASE_URL / SUPABASE_KEY belum diisi dengan benar di frontend/script.js');
  }
  const [lokasi, query = ''] = jalur.split('?');
  const [tabel, id] = lokasi.split('/');
  const q = new URLSearchParams(query);
  if (id) q.set('id', 'eq.' + id);
  return fetch(`${SUPABASE_URL}/rest/v1/${tabel}?${q}`, {
    method: metode,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }
  });
}

const $ = s => document.querySelector(s);
const rp = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

async function api(m, p, b) {
  const r = await dbRequest(m, p, b);
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error((d && d.message) || 'Permintaan gagal');
  return d;
}

const E = {
  kendaraan: { judul:'Kendaraan', icon:'🚘', q:'select=*&order=id', f:[
    ['plat','Plat'],['merek','Merek'],['tahun','Tahun','number'],['tgl_perolehan','Tgl perolehan','date'],
    ['harga_perolehan','Harga perolehan','rp'],['nilai_residu','Nilai residu','rp'],['umur_ekonomis','Umur (tahun)','number'],
    ['tarif_harian','Tarif per hari','rp'],['status','Status','select',['Tersedia','Disewa','Perawatan']]] },
  pelanggan: { judul:'Pelanggan', icon:'👤', q:'select=*&order=id', f:[
    ['nama','Nama'],['no_ktp','No. KTP'],['no_hp','No. HP'],['alamat','Alamat']] },
  sewa: { judul:'Transaksi Sewa', icon:'📋', q:'select=*,pelanggan(nama),kendaraan(plat)&order=id.desc', f:[
    ['pelanggan_id','Pelanggan','fk','pelanggan','nama'],['kendaraan_id','Kendaraan','fk','kendaraan','plat'],
    ['tgl_mulai','Tgl mulai','date'],['tgl_selesai','Tgl selesai','date'],['tarif_harian','Tarif per hari','rpx'],
    ['total_sewa','Total sewa','rpx'],['status','Status','select',['Berjalan','Selesai','Batal']]] },
  pemeliharaan: { judul:'Pemeliharaan', icon:'🔧', q:'select=*,kendaraan(plat)&order=tanggal.desc', f:[
    ['kendaraan_id','Kendaraan','fk','kendaraan','plat'],['tanggal','Tanggal','date'],['jenis','Jenis'],['biaya','Biaya','rp'],['keterangan','Keterangan']] }
};

const nav = $('#nav');
const navItems = [
  ['laporan','Dashboard','▦'],
  ...Object.entries(E).map(([k,v]) => [k,v.judul,v.icon])
];
navItems.forEach(([k,label,icon]) => {
  const b = document.createElement('button');
  b.innerHTML = `<span class="nav-icon">${icon}</span><span>${label}</span>`;
  b.onclick = () => buka(k);
  b.dataset.k = k;
  nav.appendChild(b);
});

function setPage(title, k) {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('aktif', b.dataset.k === k));
  $('#judul').textContent = title;
  $('#crumb').textContent = title;
}

async function buka(k) {
  setPage(k === 'laporan' ? 'Dashboard Armada' : E[k].judul, k);
  $('#app').innerHTML = `<div class="loading"><span class="spinner"></span>Memuat data...</div>`;
  try {
    await (k === 'laporan' ? laporan() : crud(k));
    $('#app').classList.remove('page-enter');
    void $('#app').offsetWidth;
    $('#app').classList.add('page-enter');
  } catch (e) {
    const mati = e instanceof TypeError;
    $('#app').innerHTML = `<div class="error-box"><strong>Gagal memuat data.</strong><br>${mati ? 'Tidak dapat terhubung ke Supabase. Periksa koneksi internet serta URL dan key di <code>frontend/script.js</code>.' : e.message}</div>`;
  }
}

function dashboardData(rows) {
  const sum = k => rows.reduce((a,x) => a + Number(x[k] || 0), 0);
  const tersedia = rows.filter(x => x.status === 'Tersedia').length;
  const disewa = rows.filter(x => x.status === 'Disewa').length;
  const perawatan = rows.filter(x => x.status === 'Perawatan').length;
  const pendapatan = sum('pendapatan_sewa');
  const biaya = sum('biaya_pemeliharaan');
  return { sum, tersedia, disewa, perawatan, pendapatan, biaya, laba:pendapatan-biaya };
}

function barChart(rows) {
  const sorted = [...rows].sort((a,b) => Number(b.pendapatan_sewa||0)-Number(a.pendapatan_sewa||0)).slice(0,8);
  const max = Math.max(...sorted.map(x => Number(x.pendapatan_sewa||0)), 1);
  if (!sorted.length) return '<div class="empty">Belum ada data kendaraan.</div>';
  return `<div class="bar-chart">${sorted.map(x => {
    const h = Math.max(4, Number(x.pendapatan_sewa||0)/max*100);
    return `<div class="bar-item" title="${x.plat}: ${rp(x.pendapatan_sewa)}"><div class="bar" style="--h:${h}%"></div><span>${x.plat || '-'}</span></div>`;
  }).join('')}</div>`;
}

function donut(available, rented, maintenance) {
  const total = available + rented + maintenance;
  if (!total) return `<div class="donut-wrap"><div class="empty">Belum ada armada.</div></div>`;
  const a = available/total*100;
  const b = a + rented/total*100;
  return `<div class="donut-wrap"><div class="donut" style="--available:${a}%;--rented:${b}%"><b>${total}</b></div>
    <div class="legend"><div><i class="a"></i>Tersedia <strong>${available}</strong></div><div><i class="b"></i>Disewa <strong>${rented}</strong></div><div><i class="c"></i>Perawatan <strong>${maintenance}</strong></div></div></div>`;
}

async function laporan() {
  const r = await api('GET','v_persediaan?order=id');
  const d = dashboardData(r);
  const kol = [['plat','Plat'],['merek','Merek'],['status','Status'],['harga_perolehan','Harga perolehan'],['penyusutan_tahunan','Penyusutan/tahun'],['akumulasi_penyusutan','Akumulasi'],['nilai_buku','Nilai buku'],['pendapatan_sewa','Pendapatan'],['biaya_pemeliharaan','Biaya']];
  const teks = ['plat','merek','status'];
  const kartu = [
    ['Nilai persediaan',d.sum('nilai_buku')],['Pendapatan sewa',d.pendapatan],['Biaya pemeliharaan',d.biaya],['Laba kontribusi',d.laba],['Harga perolehan',d.sum('harga_perolehan')],['Akumulasi penyusutan',d.sum('akumulasi_penyusutan')]
  ];

  $('#app').innerHTML = `
    <section class="hero"><div class="hero__eyebrow">Executive dashboard</div><h3>Ringkasan kinerja armada Vilza VVIP</h3><p>Pantau nilai persediaan, utilisasi kendaraan, pendapatan sewa, dan biaya pemeliharaan dari satu halaman.</p></section>
    <div class="kartu">${kartu.map(([l,v],i) => `<div class="${i===3?'accent':''}"><small>${l}</small><b>${rp(v)}</b></div>`).join('')}</div>
    <div class="dashboard-grid">
      <section class="panel"><div class="panel__head"><h3>Pendapatan per kendaraan</h3><small>Top 8 berdasarkan pendapatan</small></div>${barChart(r)}</section>
      <section class="panel"><div class="panel__head"><h3>Status armada</h3><small>Total kendaraan</small></div>${donut(d.tersedia,d.disewa,d.perawatan)}</section>
    </div>
    <section class="panel" style="margin-bottom:14px"><div class="panel__head"><h3>Akses cepat</h3><small>Kelola data operasional</small></div>
      <div class="quick-grid">${Object.entries(E).map(([k,v]) => `<button class="quick" data-quick="${k}"><strong>${v.icon} ${v.judul}</strong><span>Buka dan kelola data</span></button>`).join('')}</div>
    </section>
    <section class="panel"><div class="panel__head"><h3>Detail persediaan armada</h3><small>${r.length} kendaraan tercatat</small></div>
      <div class="search-row"><input id="tableSearch" placeholder="Cari plat, merek, atau status..."><span style="font-size:11px;color:var(--muted)">Data real-time dari Supabase</span></div>
      <div class="tabel"><table id="laporanTable"><thead><tr>${kol.map(([,l])=>`<th>${l}</th>`).join('')}</tr></thead>
      <tbody>${r.map(x=>`<tr>${kol.map(([k])=>teks.includes(k)?`<td>${x[k]??'-'}</td>`:`<td class="angka">${rp(x[k])}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="9" class="empty">Belum ada kendaraan.</td></tr>`}</tbody>
      <tfoot><tr><td colspan="3">Total</td>${kol.slice(3).map(([k])=>`<td class="angka">${rp(d.sum(k))}</td>`).join('')}</tr></tfoot></table></div>
    </section>`;

  document.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => buka(b.dataset.quick));
  $('#tableSearch').oninput = e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#laporanTable tbody tr').forEach(tr => tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none');
  };
}

async function crud(k) {
  const c = E[k]; let editId = null; const opsi = {};
  for (const [n,,t,tb,lb] of c.f) if (t === 'fk') opsi[n] = await api('GET',`${tb}?select=id,${lb}&order=id`);
  const rows = await api('GET',`${k}?${c.q}`);
  const input = ([n,l,t='text',a,lb]) => t === 'rpx' ? '' : `<label>${l}${t==='select'?`<select name="${n}">${a.map(o=>`<option>${o}</option>`).join('')}</select>`:t==='fk'?`<select name="${n}" required>${opsi[n].map(o=>`<option value="${o.id}">${o[lb]}</option>`).join('')}</select>`:`<input name="${n}" type="${t==='rp'?'number':t}" step="any">`}</label>`;
  const sel = ([n,,t,tb,lb],r) => t==='fk'?(r[tb]?r[tb][lb]:''):(t==='rp'||t==='rpx')?rp(r[n]):(r[n]??'');
  $('#app').innerHTML = `<form id="f">${c.f.map(input).join('')}<button class="utama">Simpan</button></form>
    <section class="panel"><div class="search-row"><strong>${c.judul}</strong><input id="crudSearch" placeholder="Cari data..."></div>
    <div class="tabel"><table id="crudTable"><thead><tr>${c.f.map(x=>`<th>${x[1]}</th>`).join('')}<th>Aksi</th></tr></thead>
    <tbody>${rows.map(r=>`<tr>${c.f.map(x=>`<td>${sel(x,r)}</td>`).join('')}<td><button class="kecil" data-e="${r.id}">Ubah</button> <button class="kecil" data-h="${r.id}">Hapus</button></td></tr>`).join('')||`<tr><td colspan="${c.f.length+1}" class="empty">Belum ada data. Isi formulir lalu pilih Simpan.</td></tr>`}</tbody></table></div></section>`;
  const form = $('#f');
  form.onsubmit = async e => { e.preventDefault(); const d={}; c.f.forEach(([n,,t])=>{if(t==='rpx')return;const v=form.elements[n].value;d[n]=v===''?null:(['number','rp','fk'].includes(t)?Number(v):v)});try{await api(editId?'PATCH':'POST',k+(editId?'/'+editId:''),d);buka(k)}catch(er){alert('Data belum tersimpan: '+er.message)}};
  $('#app').onclick = async e => {
    const h=e.target.dataset.h,u=e.target.dataset.e;
    if(h&&confirm('Hapus data ini?')){try{await api('DELETE',`${k}/${h}`);buka(k)}catch(er){alert('Gagal menghapus: '+er.message)}}
    if(u){const r=rows.find(x=>x.id==u);editId=u;c.f.forEach(([n,,t])=>{if(t!=='rpx')form.elements[n].value=r[n]??''});form.querySelector('button').textContent='Simpan perubahan';form.scrollIntoView({behavior:'smooth',block:'center'})}
  };
  $('#crudSearch').oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('#crudTable tbody tr').forEach(tr=>tr.style.display=tr.textContent.toLowerCase().includes(q)?'':'none')};
}

$('#refreshBtn').onclick = () => { const active = document.querySelector('nav button.aktif'); buka(active ? active.dataset.k : 'laporan'); };

window.addEventListener('load', () => {
  buka('laporan');
  setTimeout(() => $('#splash').classList.add('is-hidden'), 1250);
});
