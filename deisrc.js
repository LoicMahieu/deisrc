#!/usr/bin/env node

const path = require('path')
    , fs   = require('fs')
    , os = require('os')
    , mkdirp = require('mkdirp')

const DEISRC_STORE = process.env.DEISRC_STORE || path.join(process.env.HOME || process.env.USERPROFILE, '.deisrcs')
    , DEISRC       = process.env.DEISRC || path.join(process.env.HOME || process.env.USERPROFILE, '.deis/client.json')
    , USAGE       = 'Usage:\n'
                  + '  deisrc                 list all profiles\n'
                  + '  deisrc [name]          change deis profile (uses fuzzy matching)\n'
                  + '  deisrc -c [name]       create a new deis profile called name\n'


var opts
  , name

function printUsage () {
  console.error(USAGE)
  process.exit(1)
}


function printHelp () {
  process.stdout.write(
      'deisrc\n'
    + '\n'
    + '  Switch between different .deis/client.json files with ease and grace.\n\n'
    + USAGE
    + '\n'
    + 'Example:\n\n'
    + '  # Creating and activating a new Deis profile called "work":\n'
    + '  $ deisrc -c work\n\n'
    + '  # Switch betwen "work" and "default"\n'
    + '  $ deisrc work\n'
    + '  $ deisrc default\n'
  )
  process.exit(1)
}


function printNpmrcs () {
  console.log('Available Deis profiles:\n')
  fs.readlink(DEISRC, function (err, link) {
    link = link && path.basename(link)
    fs.readdirSync(DEISRC_STORE).forEach(function (deisrc) {
      if (deisrc[0] !== '.') {
        console.log(' %s %s', link == deisrc ? '*' : ' ', deisrc)
      }
    })
  })
}


// safety check so we don't go overwriting accidentally
function checkSymlink (stat) {
  if (!stat.isSymbolicLink()) {
    console.log('Current .deis/client.json (%s) is not a symlink. You may want to copy it into %s.', DEISRC, DEISRC_STORE)
    process.exit(1)
  }
}

// make the symlink
function link (name) {
  var ln = path.join(DEISRC_STORE, name || '')
    , stat

  if (ln == DEISRC_STORE || !fs.existsSync(ln)) {
    console.error('Couldn\'t find Deis file "%s".', name)
    return process.exit(1)
  }

  try {
    stat = fs.lstatSync(DEISRC)
    checkSymlink(stat)
  } catch (e) {}

  if (stat) {
    console.log('Removing old .deis/client.json (%s)', path.basename(fs.readlinkSync(DEISRC)))
    fs.unlinkSync(DEISRC)
  }

  console.log('Activating .deis/client.json "%s"', path.basename(ln))
  mkdirp.sync(path.dirname(DEISRC))
  fs.symlinkSync(ln, DEISRC, 'file')
}

// partial match deisrc names
function partialMatch(match, files) {
  files.sort() // own the sort order

  // try exact match
  var exactMatch = files.filter(function(file) {
    return file === match
  }).shift()
  if (exactMatch) return exactMatch

  // try starts with match
  var matchesStart = files.filter(function(file) {
    return file.indexOf(match) === 0
  }).shift()
  if (matchesStart) return matchesStart

  // try whatever match
  var matchesAnything = files.filter(function(file) {
    return file.match(new RegExp(match))
  }).shift()
  if (matchesAnything) return matchesAnything
}

// simplistic cmdline parser, sets "name" as the first non-'-' arg
// and sets "opts" as '-'-stripped characters (first char only)
;(function processCmdline () {
  opts = process.argv.slice(2).map(function (a) {
    return a[0] == '-' && a.replace(/^-+/, '')[0]
  }).filter(Boolean)

  name = process.argv.slice(2).filter(function (a) {
    return a[0] != '-'
  })[0] // first non '-' arg

  opts.filter(function (o) {
    if (o == 'c' || o == 'h') // other known opts go here
      return false

    console.error('Unknown option: -' + o)
    return true
  }).length && printUsage()

  if (opts.indexOf('h') > -1)
    printHelp()
}())


// set up .deisrcs if it doesn't exist
;(function makeStore () {
  function make () {
    var def = path.join(DEISRC_STORE, 'default')

    console.log('Initialising deisrc...')
    console.log('Creating %s', DEISRC_STORE)

    fs.mkdirSync(DEISRC_STORE)

    if (fs.existsSync(DEISRC)) {
      console.log('Making %s the default .deis/client.json file', DEISRC)
      fs.renameSync(DEISRC, def)
    } else {
      fs.writeFileSync(def, '')
    }

    link('default')
    process.exit(0)
  }

  try {
    var stat = fs.statSync(DEISRC_STORE)
    if (!stat.isDirectory()) {
      console.error('Error: %s is not a directory', DEISRC_STORE)
      process.exit(1)
    }
  } catch (e) {
    make()
  }
}())


// no name and no args
if (!name && !opts.length)
  return printNpmrcs()


;(function handleOPtions() {
  if (~opts.indexOf('c'))
    createNew()
}())

// handle -r <name>
function replaceRegistry() {
  if (!name) {
    console.error('Specify the registry you want to use')
    return printUsage()
  }

  var registry = registries[(name === 'slow' || name === 'default') ? 'defaultReg' : name]
    , fileContents

  try {
    fs.existsSync(NPMRC)
  } catch (e) {
    console.warn('Make sure a .npmrc file exits at %s.', NPMRC)
    process.exit(1)
  }

  if (!registry) {
    console.error('%s value is not a valid registry name', name)
    printUsage()
  }

  fileContents = fs.readFileSync(NPMRC, 'utf8').split(os.EOL)

  for (var i = 0, l = fileContents.length; i <  l; i++) {
    if (~fileContents[i].indexOf('registry')) {
      fileContents[i] = 'registry = ' + registry
      break;
    }
  }

  if (i === l)
    fileContents.unshift('registry = ' + registry)

  fs.writeFileSync(NPMRC, fileContents.join(os.EOL))

  console.log('Using %s registry.', registry)
  process.exit(0)
}

// handle -c <name>
function createNew () {
  if (!name) {
    console.error('What do you want to call your new npm configuration?')
    return printUsage()
  }

  var c = path.join(DEISRC_STORE, name)
  if (fs.existsSync(c)) {
    console.log('deisrc file "%s", already exists (%s/%s)', name, DEISRC_STORE, name)
    return process.exit(1)
  }

  fs.writeFileSync(c, '{}')
}


if (name) name = partialMatch(name, fs.readdirSync(DEISRC_STORE)) || name

// sanity/safety check, also check if they want to switch
// to the already active one
;(function checkExisting () {
  var stat
  try {
    stat = fs.lstatSync(DEISRC)
    checkSymlink(stat)
  } catch (e) {
    // ignore
  }

  if (name && stat && fs.readlinkSync(DEISRC) == path.join(DEISRC_STORE, name)) {
    console.log('Current .deis/client.json (%s) is already "%s" (%s/%s)', DEISRC, name, DEISRC_STORE, name)
    return process.exit(0)
  }
}())

// if we got here, then we're ready to switch
link(name)
