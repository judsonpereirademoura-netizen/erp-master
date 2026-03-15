export default function Home() {
  return (
    <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'1rem'}}>
      <div style={{textAlign:'center',padding:'2rem'}}>
        <h1 style={{fontSize:'1.5rem',fontWeight:'700',color:'#1e40af',margin:'0 0 0.5rem'}}>E-commerce B2B</h1>
        <p style={{color:'#64748b',margin:'0 0 0.25rem'}}>Master Rótulos e Etiquetas</p>
        <p style={{color:'#94a3b8',fontSize:'0.875rem',margin:'0 0 2rem'}}>masteretiquetas.com</p>
        <div style={{background:'#dbeafe',color:'#1e40af',padding:'0.75rem 1.5rem',borderRadius:'0.5rem',fontSize:'0.875rem',fontWeight:'500'}}>
          🚧 Em desenvolvimento — disponível em breve
        </div>
        <div style={{marginTop:'2rem'}}>
          <a href="https://erp.masteretiquetas.com" style={{color:'#3b82f6',fontSize:'0.875rem',textDecoration:'none'}}>
            ← Acessar ERP interno
          </a>
        </div>
      </div>
    </main>
  )
}
