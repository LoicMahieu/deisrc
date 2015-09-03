const test    = require('tape')
    , path    = require('path')
    , os      = require('os')
    , fs      = require('fs')
    , rimraf  = require('rimraf')
    , mkdirp  = require('mkdirp')
    , tmpdir  = require('os').tmpDir()
    , exec    = require('child_process').exec
    , xtend   = require('xtend')

    , cmd     = '"' + process.execPath + '" '
                + path.join(__dirname, 'deisrc.js')
    , homedir = path.join(tmpdir, '.deisrcs_test.' + process.pid)
    , options = { env: xtend(process.env, { HOME: homedir }) }
    , deisrc   = path.join(homedir, '.deis/client.json')
    , deisrcs  = path.join(homedir, '.deisrcs')
    , def     = path.join(homedir, '.deisrcs/default')
    , dotfile = path.join(homedir, '.deisrcs/.dotfile')


function cleanup (t) {
  rimraf(homedir, t.end.bind(t))
}


test('blank slate', function (t) {
  mkdirp.sync(homedir)

  exec(cmd, options, function (err, stdout, stderr) {
    t.notOk(err, 'no error')
    t.equal(stderr, '', 'no stderr')
    t.ok(/Initialising/.test(stdout), 'got "initialising" msg')
    t.ok(/Creating .*\.deisrcs/.test(stdout), 'got "creating" msg')
    t.ok(/Activating .deis\/client\.json "default"/, 'got "activating" msg')
    t.end()
  })
})

test('cleanup', cleanup)


test('standard .deisrcs', function (t) {
  mkdirp.sync(homedir)
  mkdirp.sync(path.dirname(deisrc))
  fs.writeFileSync(deisrc, 'foobar', 'utf8')

  exec(cmd, options, function (err, stdout, stderr) {
    t.notOk(err, 'no error')
    t.equal(stderr, '', 'no stderr')
    t.ok(/Initialising/.test(stdout), 'got "initialising" msg')
    t.ok(/Creating .*\.deisrcs/.test(stdout), 'got "creating" msg')
    t.ok(/Activating .deis\/client\.json "default"/, 'got "activating" msg')
    t.ok(/Making .*\.deisrc the default/, 'got "making default" msg')
    t.equal(fs.readFileSync(deisrc, 'utf8'), 'foobar', 'got expected contents of .deisrc')
    t.equal(fs.readFileSync(def, 'utf8'), 'foobar', 'got expected contents of .deisrcs/default')
    t.ok(fs.lstatSync(deisrc).isSymbolicLink(), '.deisrc is symlink')
    t.equal(fs.readlinkSync(deisrc), def, '.deisrc points to "default"')
    t.deepEqual(fs.readdirSync(deisrcs), [ 'default' ], 'only "default" in .deisrcs')
    t.end()
  })
})


test('create noarg', function (t) {
  exec(cmd + ' -c', options, function (err, stdout, stderr) {
    t.ok(err, 'got error')
    t.equal(err.code, 1, 'got correct exit code')
    t.equal(stdout, '', 'no stdout')
    t.ok(/Usage/.test(stderr), 'got Usage')
    t.equal(fs.readFileSync(deisrc, 'utf8'), 'foobar', 'got expected contents of .deisrc')
    t.deepEqual(fs.readdirSync(deisrcs), [ 'default' ], 'only "default" in .deisrcs')
    t.end()
  })
})


test('create new config', function (t) {
  var foobar = path.join(deisrcs, 'foobar')
  exec(cmd + ' -c foobar', options, function (err, stdout, stderr) {
    t.notOk(err, 'no error')
    t.equal(stderr, '', 'no stderr')
    t.ok(/Removing old .+\Wdefault\W/.test(stdout), 'got "removing" msg')
    t.ok(/Activating .deis\/client\.json "foobar"/.test(stdout), 'got "activating" msg')
    t.equal(fs.readFileSync(deisrc, 'utf8'), '{}', 'got expected contents of .deisrc')
    t.equal(fs.readFileSync(def, 'utf8'), 'foobar', 'got expected contents of .deisrcs/default')
    t.equal(fs.readFileSync(foobar, 'utf8'), '{}', 'got expected contents of .deisrcs/foobar')
    t.ok(fs.lstatSync(deisrc).isSymbolicLink(), '.deisrc is symlink')
    t.equal(fs.readlinkSync(deisrc), foobar, '.deisrc points to "foobar"')
    t.deepEqual(fs.readdirSync(deisrcs), [ 'default', 'foobar' ], '"default" and "foobar" in .deisrcs')
    t.end()
  })
})


test('switch config', function (t) {
  var foobar = path.join(deisrcs, 'foobar')
  exec(cmd + ' default', options, function (err, stdout, stderr) {
    t.notOk(err, 'no error')
    t.equal(stderr, '', 'no stderr')
    t.ok(/Removing old .+\Wfoobar\W/.test(stdout), 'got "removing" msg')
    t.ok(/Activating .deis\/client\.json "default"/.test(stdout), 'got "activating" msg')
    t.equal(fs.readFileSync(deisrc, 'utf8'), 'foobar', 'got expected contents of .deisrc')
    t.equal(fs.readFileSync(def, 'utf8'), 'foobar', 'got expected contents of .deisrcs/default')
    t.equal(fs.readFileSync(foobar, 'utf8'), '{}', 'got expected contents of .deisrcs/foobar')
    t.ok(fs.lstatSync(deisrc).isSymbolicLink(), '.deisrc is symlink')
    t.equal(fs.readlinkSync(deisrc), def, '.deisrc points to "foobar"')
    t.deepEqual(fs.readdirSync(deisrcs), [ 'default', 'foobar' ], '"default" and "foobar" in .deisrcs')
    t.end()
  })
})


test('list config', function (t) {
  fs.writeFileSync(dotfile, '.dotfile', 'utf8')
  exec(cmd, options, function (err, stdout, stderr) {
    t.notOk(err, 'no error')
    t.equal(stderr, '', 'no stderr')
    t.ok(/Available Deis profiles/.test(stdout), 'got "available" msg')
    t.ok((/\* default$/m).test(stdout), 'listed "default"')
    t.ok((/  foobar$/m).test(stdout), 'listed "foobar"')
    t.notOk((/\.dotfile$/m).test(stdout), 'listed "dotfile"')
    t.end()
  })
})


test('switch to non-existent config', function (t) {
  exec(cmd + ' doobar', options, function (err, stdout, stderr) {
    t.ok(err, 'got error')
    t.equal(err.code, 1, 'got correct exit code')
    t.equal(stdout, '', 'no stdout')
    console.log(stderr);
    t.ok(/Couldn't find Deis file "doobar"/.test(stderr), 'got expected error message')
    t.end()
  })
})


test('partial matching start of deisrc', function (t) {
  exec(cmd + ' foo', options, function (err, stdout, stderr) {
    t.notOk(err, 'no error')
    t.equal(stderr, '', 'no stderr')
    t.ok(/Activating .deis\/client\.json "foobar"/.test(stdout), 'got "activating" msg')
    t.end()
  })
})


test('partial matching prefers full match over partial', function (t) {
  exec(cmd + ' -c foo', options, function (err, stdout, stderr) {
  // create foo
    t.notOk(err, 'no error')
    // match against foobar should pick foobar not foo
    exec(cmd + ' foobar', options, function (err, stdout, stderr) {
      t.notOk(err, 'no error')
      t.equal(stderr, '', 'no stderr')
      t.ok(/Activating .deis\/client\.json "foobar"/.test(stdout), 'got "activating" msg')
      t.end()
    })
  })
})


test('partial matching prefers start of word match over partial match', function (t) {
  exec(cmd + ' -c bar', options, function (err, stdout, stderr) { // create bar
    t.notOk(err, 'no error')
    exec(cmd + ' default', options, function (err, stdout, stderr) { // switch to default
      t.notOk(err, 'no error')
      exec(cmd + ' ba', options, function (err, stdout, stderr) {
        // ensure 'ba' switches to bar not foobar.
        t.notOk(err, 'no error')
        t.equal(stderr, '', 'no stderr')
        t.ok(/Activating .deis\/client\.json "bar"/.test(stdout), 'got "activating" msg')
        t.end()
      })
    })
  })
})


test('partial matching can match any part of deisrc', function (t) {
  exec(cmd + ' ooba', options, function (err, stdout, stderr) {
    t.notOk(err, 'no error')
    t.equal(stderr, '', 'no stderr')
    t.ok(/Activating .deis\/client\.json "foobar"/.test(stdout), 'got "activating" msg')
    t.end()
  })
})


test('partial matching matches alphabetically', function (t) {
  exec(cmd + ' -c car', options, function (err, stdout, stderr) { // create car
    t.notOk(err, 'no error')
    exec(cmd + ' default', options, function (err, stdout, stderr) { // switch to default
      t.notOk(err, 'no error')
      var foobar = path.join(deisrcs, 'foobar')
      // try match ar from bar, car, foobar
      // should pick bar
      exec(cmd + ' ar', options, function (err, stdout, stderr) {
        t.notOk(err, 'no error')
        t.equal(stderr, '', 'no stderr')
        t.ok(/Activating .deis\/client\.json "bar"/.test(stdout), 'got "activating" msg')
        t.end()
      })
    })
  })
})

test('cleanup', cleanup)
