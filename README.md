deisrc
=====

[![Greenkeeper badge](https://badges.greenkeeper.io/LoicMahieu/deisrc.svg)](https://greenkeeper.io/)

Switch between different .deis/client.json files with ease and grace.

Inspiration
--------

This module is totally inspired (and mainly copied) from excellent [deoxxa/npmrc](https://github.com/deoxxa/npmrc).


Overview
--------

If you administer multiple [Deis](http://deis.io/) clusters, you know the pain
of switching between a bunch of different .deis/client.json files. Let that be a
problem no more! `deisrc` is here to save the day, by making it dead simple to
switch out your .deis/client.json with a specific named version. It also tries to protect
you from your own stupid self by making sure you don't accidentally overwrite an
.deis/client.json that you actually want to keep.


Installation
------------

``` sh
npm install -g deisrc
```

Usage
-----

```
➜  ~  deisrc --help

deisrc

  Switch between different .deis/client.json files with ease and grace.

Usage:
  deisrc                 list all profiles
  deisrc [name]          change deis profile (uses fuzzy matching)
  deisrc -c [name]       create a new deis profile called name

Example:

  # Creating and activating a new Deis profile called "work":
  $ deisrc -c work

  # Switch betwen "work" and "default"
  $ deisrc work
  $ deisrc default
```

#### Initialisation

Calling `deisrc` without arguments creates an `~/.deisrcs/` directory if it doesn't exist,
and copies your current `~/.deis/client.json` as the 'default' .deis/client.json profile.

```
➜  ~  deisrc
Creating /Users/loic/.deisrcs
Making /Users/loic/.deis/client.json the default deisrc file
Activating .deis/client.json 'default'
```

#### Create a new .deis/client.json profile

```
➜  ~  deisrc -c newprofile
Removing old .deis/client.json (/home/loic/.deisrcs/default)
Activating .deis/client.json 'newprofile'
```

A blank profile will be created.

Then use `deis register` or `deis login` to authenticate with the new profile.


#### List available .deis/client.json profiles

```
➜  ~  deisrc
Available deisrcs:

* default
  work
```

#### Switch to a specific .deis/client.json

```
➜  ~  deisrc work
Removing old .deis/client.json (/Users/loic/.deisrcs/default)
Activating .deis/client.json 'work'
```

You can also pass only the first few characters of a profile and `deisrc` will
autocomplete the profile's name.

```
➜  ~  deisrc def
Removing old .deis/client.json (/Users/loic/.deisrcs/work)
Activating .deis/client.json 'default'
```

`deisrc <name>` will also go to some lengths to make sure you don't overwrite
anything you might care about:

```
➜  ~  deisrc default
Removing old .deis/client.json (/Users/loic/.deisrcs/work)
Activating .deis/client.json 'default'
➜  ~  deisrc default  
Current .deis/client.json (/Users/loic/.deis/client.json) is already 'default' (/Users/loic/.deisrcs/default)
➜  ~  rm ~/.deis/client.json
➜  ~  touch ~/.deis/client.json
➜  ~  deisrc default
Current .deis/client.json (/Users/loic/.deis/client.json) is not a regular file, not removing it
➜  ~  rm ~/.deis/client.json
➜  ~  deisrc default
Activating .deis/client.json 'default'
```

Note For Windows Users
----------------------

You may have to run deisrc in a shell (cmd, PowerShell, Git Bash, etc) with
elevated (Administrative) privileges to get it to run.

Environment Variables
---------------------

* `DEISRC_STORE` - Path to directory of profiles. Default: `~/.deisrcs/`
* `DEISRC` - Path to the .deis/client.json file used by Deis. Default: `~/.deis/client.json`

License
-------

3-clause BSD. A copy is included with the source.
