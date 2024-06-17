import express from 'express'
import session from 'express-session';
import fs, { readdir, readdirSync } from 'fs'
import path from 'path'
import OpenAI from "openai";


const openai = new OpenAI();
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
}));    

app.use('/public', express.static('public'));

app.set('view engine', 'ejs');
app.set('views', './views');


//routes
app.get('/', async (req,res) => {
    function readLogs(){
        const folderPath = path.join(process.cwd(), 'public/logs');
        var files = fs.readdirSync(folderPath)
        return files
    }
    const data = readLogs()
    const filename = req.session.filename
    var content = []
    if(filename){
        async function readFile(filename){
            const filePath = path.join(process.cwd(), 'public/logs/' + filename);
            var result = fs.readFileSync(filePath, 'utf8')
            return result
            }  
        var content = await readFile(filename)
        content = JSON.parse(content)
    }

    res.render('index',{data:data, content:content}) //logs
});


app.post('/convo/:filename', async(req,res) =>{
    const filename = req.body.data
    req.session.filename = filename
    res.redirect('/')
})

app.post('/newfile', async(req,res) =>{
    const filename = 'NewChat.json'
    async function writeFile(filename){
        const filePath = path.join(process.cwd(), 'public/logs/' + filename);
        fs.writeFileSync(filePath,
            '[{"role":"user","content":"hi!"},{"role":"assistant","content":"Hello! How can I assist you today?"}]',
        )
        return filePath
    }
    async function DesignateFilename(OriginalFileName) {
        let index = 1;    
        let filename = OriginalFileName
        var filePath = path.join(process.cwd(), 'public/logs/' + filename);
        // Check if file exists, and if it does, increment the index
        while (fs.existsSync(filePath)) {
            filename = `NewChat${index}.json`;
            filePath = path.join(process.cwd(), 'public/logs/' + filename);
            index++;
        }
        return filename;
    }
    const finalFileName = await DesignateFilename(filename)
    await writeFile(finalFileName)
    req.session.filename = finalFileName
    res.redirect('/')
})



app.post('/prompt', async (req,res) =>{
    var message  = req.body.focus //should be a string of text
    const filename = req.session.filename

    async function readFile(filename){
        const filePath = path.join(process.cwd(), 'public/logs/' + filename);
        var result = fs.readFileSync(filePath, 'utf8')
        return result
        }  
    var content = await readFile(filename)

    async function prompt(message, convo = []) {
        const completion = await openai.chat.completions.create({
          messages: convo,
          model: "gpt-3.5-turbo", //CHANGE GPT MODEL HERE
        // model:"gpt-4o",
        });
        return completion.choices[0].message.content
      }
    content = JSON.parse(content)
    content.push({"role": "user", "content": message})
    const convo = content.map(jsonObj => {return jsonObj;});
    const result = await prompt(message, convo)
    content.push({"role":"assistant","content": result})
    const jsonResult = JSON.stringify(content)
    // fs.writeFile(filename, jsonResult, 'utf8')
    async function saveContent(filename, content){
        const filePath = path.join(process.cwd(), 'public/logs/' + filename);
        fs.writeFileSync(filePath, content)
    }
    await saveContent(filename, jsonResult)
    res.redirect('/')
})


app.post('/rename/:filename', async(req,res)=>{
    var filenameOld = req.body.data
    var filenameNew = req.params.filename
    console.log(filenameOld, filenameNew)
    if(filenameNew.slice(-5) != ".json"){
        filenameNew = filenameNew.concat(".json")
    }
    async function renameFile(filenameOld,filenameNew){
        const filePathOld = path.join(process.cwd(), 'public/logs/' + filenameOld);       
        const filePathNew = path.join(process.cwd(), 'public/logs/' + filenameNew);
        fs.renameSync(filePathOld, filePathNew)
        return filePathNew
    }
    await renameFile(filenameOld,filenameNew)
    req.session.filename = filenameNew
    res.redirect('/')
})

app.post('/delete/:filename', async(req,res) =>{
    var filename = req.body.data
    async function deleteFile(filename){
        const filePath = path.join(process.cwd(), 'public/logs/' + filename)
        fs.unlinkSync(filePath)
        return filePath
    }
    await deleteFile(filename)
    req.session.filename = null
    res.redirect('/')
})

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
