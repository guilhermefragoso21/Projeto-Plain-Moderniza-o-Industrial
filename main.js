function setTab(btn, tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('empresa-fields').style.display = tab === 'empresa' ? 'grid' : 'none';
  document.getElementById('pessoal-fields').style.display = tab === 'pessoal' ? 'grid' : 'none';
  document.getElementById('toast').classList.remove('show');
}

function handleSubmit() {
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}
